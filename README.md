# Paste File to Property

An [Obsidian](https://obsidian.md/) plugin that allows you to paste copied files directly into frontmatter properties, automatically converting them to the proper link format.

## Features

- 🎯 **Direct Property Pasting**: Paste files directly into property fields in editing mode
- 🔄 **Auto-Conversion**: Automatically converts `![[file]]` to `"[[file|displayname]]"` format
- ⚙️ **Configurable Display**: Toggle file extensions in display names on/off
- 📝 **Dual Mode Support**: Works in both Source mode and Live Preview/Editing mode
- 🎨 **Frontmatter Only**: Only processes files within frontmatter properties
- 🚀 **Real-time Processing**: Automatic conversion on paste

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Paste File to Property"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/ZeroMB/paste-file-to-property/releases)
2. Extract the files to your vault's `.obsidian/plugins/paste-file-to-property/` folder
3. Reload Obsidian and enable the plugin in Settings > Community Plugins

## Usage

### In Source Mode

Simply paste or type file references in your frontmatter:

```yaml
---
Cover: ![[my-image.jpg]]
Document: ![[folder/my-document.pdf]]
---
```

The plugin automatically converts them to:

```yaml
---
Cover: "[[my-image.jpg|my-image]]"
Document: "[[folder/my-document.pdf|my-document]]"
---
```

### In Editing Mode (Property Panel)

1. Open a note in **Live Preview** or **Editing** mode
2. Navigate to the **Properties** panel at the top
3. Click on any text property field (e.g., "Cover", "Read", "Document")
4. **Paste** or **drag and drop** your file directly into the property field
5. The file will be automatically saved and the property will be populated with the converted format

## Settings

The plugin includes one simple setting:

- **Show file extension**: Toggle whether to include file extensions in the display names
  - `ON`: `"[[file.pdf|file.pdf]]"`
  - `OFF`: `"[[file.pdf|file]]"`

## Supported File Types

The plugin works with all file types that Obsidian can handle:
- Images (JPG, PNG, GIF, SVG, etc.)
- Documents (PDF, DOCX, TXT, etc.)
- Audio files (MP3, WAV, etc.)
- Video files (MP4, MOV, etc.)
- Any other file type

## Commands

The plugin adds one command to the Command Palette:

- **Convert frontmatter file references**: Manually trigger conversion of all `![[file]]` references in the current note's frontmatter

## Requirements

- Obsidian v0.15.0 or higher
- Works on both Desktop and Mobile versions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have feature requests, please [open an issue](https://github.com/ZeroMB/paste-file-to-property/issues) on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.