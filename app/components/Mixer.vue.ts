import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { AudioService } from '../services/audio';
import { Inject } from '../services/core/injector';
import MixerItem from './MixerItem.vue';
import { $t } from 'services/i18n';
import { Menu } from 'util/menus/Menu';
import { EditorCommandsService } from 'services/editor-commands';
import { ScenesService } from 'services/scenes';

@Component({
  components: { MixerItem },
})
export default class Mixer extends Vue {
  @Inject() audioService: AudioService;
  @Inject() editorCommandsService: EditorCommandsService;
  @Inject() scenesService: ScenesService;

  advancedSettingsTooltip = $t('Open advanced audio settings');
  mixerTooltip = $t('Monitor audio levels. If the bars are moving you are outputting audio.');

  showAdvancedSettings() {
    this.audioService.showAdvancedSettings();
  }

  handleRightClick() {
    const menu = new Menu();
    menu.append({
      label: $t('Unhide All'),
      click: () => this.editorCommandsService.executeCommand('UnhideMixerSourcesCommand'),
    });
    menu.popup();
  }

  get audioSources() {
    // TODO: Reactivity hack
    this.scenesService.activeSceneId;
    this.scenesService.activeScene.nodes;

    return this.audioService.getSourcesForCurrentScene().filter(source => {
      return !source.mixerHidden;
    });
  }
}
