import { Plugin, PluginSettingTab, Setting, App, TFile, Editor, EditorPosition, Notice, MarkdownView } from 'obsidian';

interface AutoFrontmatterConverterSettings {
	includeFileExtension: boolean;
}

const DEFAULT_SETTINGS: AutoFrontmatterConverterSettings = {
	includeFileExtension: false
}

export default class AutoFrontmatterConverterPlugin extends Plugin {
	settings: AutoFrontmatterConverterSettings;

	async onload() {
		await this.loadSettings();

		// Register paste event handler with capture phase
		this.registerDomEvent(document, 'paste', this.handlePaste.bind(this), true);

		// Register editor change handler for typing
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				this.handleEditorChange(editor);
			})
		);

		// Add settings tab
		this.addSettingTab(new AutoFrontmatterConverterSettingTab(this.app, this));

		// Add command for manual conversion
		this.addCommand({
			id: 'convert-frontmatter-references',
			name: 'Convert frontmatter file references',
			editorCallback: (editor: Editor) => {
				this.convertFrontmatterReferences(editor);
			}
		});
	}

	async handlePaste(evt: ClipboardEvent) {
		const activeEl = document.activeElement as HTMLElement;

		// Check if we're pasting in a frontmatter property field
		if (this.isValidFrontmatterField(activeEl)) {
			await this.handleFilePasteInProperty(evt, activeEl);
			return;
		}

		// Handle regular editor paste
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const editor = activeView.editor;
		if (!editor) return;

		// Small delay to let the paste complete
		setTimeout(() => {
			this.convertFrontmatterReferences(editor);
		}, 50);
	}

	isValidFrontmatterField(element: HTMLElement | null): boolean {
		if (!element) return false;
		return element.matches('.metadata-input-longtext.mod-truncate'); // text property fields
	}

	async handleFilePasteInProperty(evt: ClipboardEvent, target: HTMLElement) {
		if (!evt.clipboardData) return;

		const items: DataTransferItemList = evt.clipboardData.items;
		for (let i = 0; i < items.length; i++) {
			const item = items[i];

			// Handle direct file paste
			if (item.kind === "file" && evt.clipboardData.types[0] === 'Files') {
				const file = item.getAsFile();
				if (file) {
					await this.saveFileAndWriteLink(file, target);
					evt.preventDefault();
					break;
				}
			}
			// Handle copied images from web (image data in clipboard)
			else if (item.kind === "file" && item.type.startsWith("image/")) {
				const file = item.getAsFile();
				if (file) {
					await this.saveImageAndWriteLink(file, target);
					evt.preventDefault();
					break;
				}
			}
		}
	}

	async saveFileAndWriteLink(file: File, target: HTMLElement) {
		const arrayBuffer = await file.arrayBuffer();
		const fileName = file.name;

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice(`No active file!`);
			return;
		}

		const savePath = await this.app.fileManager.getAvailablePathForAttachment(fileName, activeFile.path);

		// Store selected property before saving
		const activeEl = document.activeElement as HTMLElement;
		const propertyElement = activeEl.parentNode?.parentNode?.querySelector('[aria-label]') as HTMLElement;
		const propertyName = propertyElement?.getAttribute("aria-label");

		const newFile = await this.app.vault.createBinary(savePath, arrayBuffer);

		// Generate the link based on settings
		let displayName: string;
		const fileNameOnly = savePath.split('/').pop() || fileName;

		if (this.settings.includeFileExtension) {
			displayName = fileNameOnly;
		} else {
			displayName = fileNameOnly.replace(/\.[^/.]+$/, '');
		}

		const linkText = `[[${savePath}|${displayName}]]`;
		await this.writeLinkIntoFrontmatter(activeFile, linkText, activeEl, propertyName, newFile);
	}

	async saveImageAndWriteLink(file: File, target: HTMLElement) {
		const arrayBuffer = await file.arrayBuffer();
		const fileExtension = file.type.split("/")[1] || "png";
		const fileName = `Pasted image ${Date.now()}.${fileExtension}`;

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice(`No active file!`);
			return;
		}

		const savePath = await this.app.fileManager.getAvailablePathForAttachment(fileName, activeFile.path);

		// Store selected property before saving
		const activeEl = document.activeElement as HTMLElement;
		const propertyElement = activeEl.parentNode?.parentNode?.querySelector('[aria-label]') as HTMLElement;
		const propertyName = propertyElement?.getAttribute("aria-label");

		const newFile = await this.app.vault.createBinary(savePath, arrayBuffer);

		// Generate the link based on settings
		let displayName: string;
		const fileNameOnly = savePath.split('/').pop() || fileName;

		if (this.settings.includeFileExtension) {
			displayName = fileNameOnly;
		} else {
			displayName = fileNameOnly.replace(/\.[^/.]+$/, '');
		}

		const linkText = `[[${savePath}|${displayName}]]`;
		await this.writeLinkIntoFrontmatter(activeFile, linkText, activeEl, propertyName, newFile);
	}

	async writeLinkIntoFrontmatter(activeFile: TFile, filePath: string, activeEl: HTMLElement, propertyName: string | null | undefined, newFile: TFile) {
		if (document.activeElement as HTMLElement === activeEl)
			activeEl.blur();
		await new Promise(resolve => setTimeout(resolve, 50));

		try {
			if (!propertyName)
				throw new Error("aria-label attribute not found on the expected element.");

			await this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
				frontmatter[propertyName] = filePath;
			});
		} catch (error) {
			await this.app.fileManager.trashFile(newFile);
			new Notice(`Failed to update frontmatter!\n${error}`);
			console.error("Error updating frontmatter:", error);
		}
	}

	handleEditorChange(editor: Editor) {
		// Debounce the conversion to avoid excessive processing
		clearTimeout((this as any).changeTimeout);
		(this as any).changeTimeout = setTimeout(() => {
			this.convertFrontmatterReferences(editor);
		}, 300);
	}

	convertFrontmatterReferences(editor: Editor) {
		const content = editor.getValue();

		// Check if the file has frontmatter
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return;

		const frontmatter = frontmatterMatch[1];
		const beforeFrontmatter = content.substring(0, frontmatterMatch.index! + 4); // "---\n"
		const afterFrontmatter = content.substring(frontmatterMatch.index! + frontmatterMatch[0].length);

		// Check if there are any unconverted references
		const regex = /!\[\[([^\]]+)\]\]/g;
		if (!regex.test(frontmatter)) return;

		// Reset regex for replacement
		regex.lastIndex = 0;

		const newFrontmatter = frontmatter.replace(regex, (match, filepath) => {
			let filename: string;

			if (this.settings.includeFileExtension) {
				// Keep the full filename with extension
				filename = filepath.split('/').pop() || filepath;
			} else {
				// Remove the file extension
				const fullFilename = filepath.split('/').pop() || filepath;
				filename = fullFilename.replace(/\.[^/.]+$/, '');
			}

			return `"[[${filepath}|${filename}]]"`;
		});

		// Only update if there were changes
		if (newFrontmatter !== frontmatter) {
			const newContent = beforeFrontmatter + newFrontmatter + '\n---' + afterFrontmatter;

			// Get current cursor position
			const cursor = editor.getCursor();

			// Replace content
			editor.setValue(newContent);

			// Restore cursor position
			editor.setCursor(cursor);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AutoFrontmatterConverterSettingTab extends PluginSettingTab {
	plugin: AutoFrontmatterConverterPlugin;

	constructor(app: App, plugin: AutoFrontmatterConverterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Show file extension')
			.setDesc('Show or hide file extensions in names.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeFileExtension)
				.onChange(async (value) => {
					this.plugin.settings.includeFileExtension = value;
					await this.plugin.saveSettings();
				}));
	}
}