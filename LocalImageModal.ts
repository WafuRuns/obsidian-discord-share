import { html } from "common-tags";
import DiscordManager from "DiscordManager";
import DiscordSharePlugin from "main";
import {
	FuzzyMatch,
	FuzzySuggestModal,
	Notice,
	TFile,
	TFolder,
	Vault,
} from "obsidian";
import { DEFAULT_VALUES } from "Settings";

const IMAGE_FORMATS = [
	"apng",
	"avif",
	"gif",
	"jpg",
	"jpeg",
	"jpe",
	"jif",
	"jfif",
	"png",
	"webp",
];

export default class LocalImageModal extends FuzzySuggestModal<TFile> {
	plugin: DiscordSharePlugin;
	vault: Vault;
	targetFile: TFile;
	discordManager: DiscordManager;

	constructor(plugin: DiscordSharePlugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.vault = plugin.app.vault;
		this.discordManager = plugin.discordManager;

		this.containerEl.addClass("banner-local-image-modal");
		this.limit = this.plugin.getSettingValue("localSuggestionsLimit") || 10;
		this.setPlaceholder("Pick an image to send to Discord.");
	}

	getItems(): TFile[] {
		const path = this.plugin.getSettingValue("attachmentsFolder") || "/";

		if (path === DEFAULT_VALUES.attachmentsFolder) {
			return this.vault
				.getFiles()
				.filter((f) => IMAGE_FORMATS.includes(f.extension));
		}

		const folder = this.vault.getAbstractFileByPath(path);

		if (!folder || !(folder instanceof TFolder)) {
			new Notice(
				createFragment((frag) => {
					frag.appendText("ERROR! Make sure that you set the ");
					frag.createEl("b", { text: "Attachments folder" });
					frag.appendText(" to a valid folder in the settings.");
				}),
				7000
			);
			this.close();
			return [];
		}
		return this.getImagesInFolder(folder);
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	renderSuggestion(match: FuzzyMatch<TFile>, el: HTMLElement) {
		super.renderSuggestion(match, el);

		const { showPreviewInLocalModal } = this.plugin.settings;
		if (showPreviewInLocalModal) {
			const content = el.innerHTML;
			el.addClass("banner-suggestion-item");
			el.innerHTML = html`
				<p class="suggestion-text">${content}</p>
				<div class="suggestion-image-wrapper">
					<img src="${this.vault.getResourcePath(match.item)}" />
				</div>
			`;
		}
	}

	async onChooseItem(image: TFile) {
		const resourcePath = this.vault.getResourcePath(image);
		const filePath = this.convertResourcePath(
			resourcePath,
			image.extension
		);
		console.log(filePath);
		await this.discordManager.sendAttachment(filePath, image.name);
	}

	private getImagesInFolder(folder: TFolder): TFile[] {
		const files: TFile[] = [];
		folder.children.forEach((abFile) => {
			if (abFile instanceof TFolder) {
				if (abFile instanceof TFolder) {
					files.push(...this.getImagesInFolder(abFile));
				}
			}
			const file = abFile as TFile;
			if (IMAGE_FORMATS.includes(file.extension)) {
				files.push(file);
			}
		});
		return files;
	}

	// This is dumb but I wanted to get it working ASAP. Need to revisit at some point.
	private convertResourcePath(resourcePath: string, fileExtension: string) {
		let filePath = resourcePath.split("local").pop()!;
		let filePath2 = filePath?.substring(
			0,
			filePath?.lastIndexOf(fileExtension) + fileExtension.length
		);

		return decodeURIComponent(filePath2);
	}
}
