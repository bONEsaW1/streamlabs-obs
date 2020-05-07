import { StatefulService, mutation } from 'services/core/stateful-service';
import { NavigationService } from 'services/navigation';
import { UserService } from 'services/user';
import { Inject, ViewHandler } from 'services/core/';
import { SceneCollectionsService } from 'services/scene-collections';
import * as onboardingSteps from 'components/pages/onboarding-steps';
import TsxComponent from 'components/tsx-component';
import { OS } from 'util/operating-systems';
import { $t } from './i18n';

enum EOnboardingSteps {
  MacPermissions = 'MacPermissions',
  Connect = 'Connect',
  ChooseYourAdventure = 'ChooseYourAdventure',
  ObsImport = 'ObsImport',
  HardwareSetup = 'HardwareSetup',
  ThemeSelector = 'ThemeSelector',
  Optimize = 'Optimize',
}

const ONBOARDING_STEPS = () => ({
  [EOnboardingSteps.MacPermissions]: {
    element: onboardingSteps.MacPermissions,
    disableControls: false,
    hideSkip: true,
    hideButton: true,
    isPreboarding: true,
  },
  [EOnboardingSteps.Connect]: {
    element: onboardingSteps.Connect,
    disableControls: false,
    hideSkip: true,
    hideButton: true,
    isPreboarding: true,
  },
  [EOnboardingSteps.ChooseYourAdventure]: {
    element: onboardingSteps.ChooseYourAdventure,
    disableControls: true,
    hideSkip: true,
    hideButton: true,
    isPreboarding: true,
  },
  [EOnboardingSteps.ObsImport]: {
    element: onboardingSteps.ObsImport,
    disableControls: true,
    hideSkip: true,
    hideButton: true,
    label: $t('Import'),
  },
  [EOnboardingSteps.HardwareSetup]: {
    element: onboardingSteps.HardwareSetup,
    disableControls: false,
    hideSkip: false,
    hideButton: false,
    label: $t('Set Up Mic and Webcam'),
  },
  [EOnboardingSteps.ThemeSelector]: {
    element: onboardingSteps.ThemeSelector,
    disableControls: false,
    hideSkip: false,
    hideButton: true,
    label: $t('Add a Theme'),
  },
  [EOnboardingSteps.Optimize]: {
    element: onboardingSteps.Optimize,
    disableControls: false,
    hideSkip: false,
    hideButton: true,
    label: $t('Optimize'),
  },
});

interface IOnboardingStep {
  element: typeof TsxComponent;
  disableControls: boolean;
  hideSkip: boolean;
  hideButton: boolean;
  label?: string;
  isPreboarding?: boolean;
}

interface IOnboardingOptions {
  isLogin: boolean; // When logging into a new account after onboarding
  isOptimize: boolean; // When re-running the optimizer after onboarding
  isSecurityUpgrade: boolean; // When logging in, display a special message
  // about our security upgrade.
  isHardware: boolean; // When configuring capture defaults
}

interface IOnboardingServiceState {
  options: IOnboardingOptions;
  importedFromObs: boolean;
  existingSceneCollections: boolean;
}

class OnboardingViews extends ViewHandler<IOnboardingServiceState> {
  get singletonStep(): IOnboardingStep {
    if (this.state.options.isLogin) return ONBOARDING_STEPS()[EOnboardingSteps.Connect];
    if (this.state.options.isOptimize) return ONBOARDING_STEPS()[EOnboardingSteps.Optimize];
    if (this.state.options.isHardware) return ONBOARDING_STEPS()[EOnboardingSteps.HardwareSetup];
  }

  get steps() {
    const steps: IOnboardingStep[] = [];

    if (process.platform === OS.Mac) {
      steps.push(ONBOARDING_STEPS()[EOnboardingSteps.MacPermissions]);
    }

    steps.push(ONBOARDING_STEPS()[EOnboardingSteps.Connect]);
    steps.push(ONBOARDING_STEPS()[EOnboardingSteps.ChooseYourAdventure]);

    if (this.state.importedFromObs) {
      steps.push(ONBOARDING_STEPS()[EOnboardingSteps.ObsImport]);
    } else {
      steps.push(ONBOARDING_STEPS()[EOnboardingSteps.HardwareSetup]);
    }

    if (!this.state.existingSceneCollections) {
      steps.push(ONBOARDING_STEPS()[EOnboardingSteps.ThemeSelector]);
    }

    if (this.getServiceViews(UserService).isTwitchAuthed) {
      steps.push(ONBOARDING_STEPS()[EOnboardingSteps.Optimize]);
    }

    return steps;
  }
}

export class OnboardingService extends StatefulService<IOnboardingServiceState> {
  static initialState: IOnboardingServiceState = {
    options: {
      isLogin: false,
      isOptimize: false,
      isSecurityUpgrade: false,
      isHardware: false,
    },
    importedFromObs: false,
    existingSceneCollections: false,
  };

  localStorageKey = 'UserHasBeenOnboarded';

  @Inject() navigationService: NavigationService;
  @Inject() userService: UserService;
  @Inject() sceneCollectionsService: SceneCollectionsService;

  @mutation()
  SET_OPTIONS(options: Partial<IOnboardingOptions>) {
    Object.assign(this.state.options, options);
  }

  @mutation()
  SET_OBS_IMPORTED(val: boolean) {
    this.state.importedFromObs = val;
  }

  @mutation()
  SET_EXISTING_COLLECTIONS(val: boolean) {
    // this.state.existingSceneCollections = val;
  }

  get views() {
    return new OnboardingViews(this.state);
  }

  get options() {
    return this.state.options;
  }

  get existingSceneCollections() {
    return !(
      this.sceneCollectionsService.loadableCollections.length === 1 &&
      this.sceneCollectionsService.loadableCollections[0].auto
    );
  }

  init() {
    this.SET_EXISTING_COLLECTIONS(this.existingSceneCollections);
  }

  setObsImport(val: boolean) {
    this.SET_OBS_IMPORTED(val);
  }

  // A login attempt is an abbreviated version of the onboarding process,
  // and some steps should be skipped.
  start(options: Partial<IOnboardingOptions> = {}) {
    const actualOptions: IOnboardingOptions = {
      isLogin: false,
      isOptimize: false,
      isSecurityUpgrade: false,
      isHardware: false,
      ...options,
    };

    this.SET_OPTIONS(actualOptions);
    this.navigationService.navigate('Onboarding');
  }

  // Ends the onboarding process
  finish() {
    localStorage.setItem(this.localStorageKey, 'true');
    this.navigationService.navigate('Studio');
  }

  get isTwitchAuthed() {
    return this.userService.isLoggedIn && this.userService.platform.type === 'twitch';
  }

  get isFacebookAuthed() {
    return this.userService.isLoggedIn && this.userService.platform.type === 'facebook';
  }

  startOnboardingIfRequired() {
    // if (localStorage.getItem(this.localStorageKey)) {
    //   this.forceLoginForSecurityUpgradeIfRequired();
    //   return false;
    // }

    this.start();
    return true;
  }

  forceLoginForSecurityUpgradeIfRequired() {
    if (!this.userService.isLoggedIn) return;

    if (!this.userService.apiToken) {
      this.start({ isLogin: true, isSecurityUpgrade: true });
    }
  }
}
