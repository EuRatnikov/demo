export type SynchronizationState = ReturnType<typeof provideSynchronizationSettings>;

const key: InjectionKey<SynchronizationState> = Symbol('sync');

export const injectSynchronizationSettings = createInjector(key);

/**
 * Данный код представляет из себя часть логики синхронизации данных, которая была реализована мной недавно для нашего приложения
 *****************************************/

export function provideSynchronizationSettings () {
	const { isOnline, offlineModeIsOn, syncInProgress } = injectNetwork();
	const { isSyncSettingOpened, closeSyncSettings } = useSyncSettingsNavigation();
	const {
		isAutoSyncEnabled,
    isWifiOnly,
    shouldSyncDictImages,
    hasAnythingToSync,
    selectedFarmsIds,
    syncProgresses,
    syncChanges,
    draftsQuantity,
    syncStates,
    updateInProgress,
    hasSpaceOnDevice,
    autoSyncTiming,
    setIsAutoSyncEnabled,
    setIsWifiOnly,
    setShouldSyncDictImages,
    updateSyncProgressStatus,
    updateSyncStatus,
    updateSyncSettings,
    cancelOfflineDataSync,
    cancelGeneralAndFarmsDataSync,
    cancelBackgroundSyncEverything,
    cancelDictionariesDataSync,
    cancelDictImagesSync,
    cancelWeatherDataSync,
    cancelFarmDzzDataSync,
    syncOfflineUserData,
    syncGeneralAndFarmsData,
    syncDicts,
    syncDictsImages,
    syncWeather,
    syncFarmDzzData,
    syncAll
  } = injectOfflineData();

	const isFarmsSyncPage = ref(false);
	const tempSelectedFarmsIds = ref([...selectedFarmsIds.value || []]);
	const scroller = ref();
	const farmControl = ref();
	const farmControlIndex = ref();

	/**
	 * SYNC_SETTINGS_CONTENT (GENERAL)
	 *****************************************/

	const syncSettingsHeaderText = computed(
		() => isFarmsSyncPage.value
			? i18n.FARMS_TITLE
			: i18n.DATA_EXCHANGE_TITLE
	);
	const showAutoSync = computed(() => isAutoSyncEnabled.value && isOnline.value && !isFarmsSyncPage.value);
	const showManualSync = computed(() => !isAutoSyncEnabled.value && isOnline.value && !isFarmsSyncPage.value);
	const canShowButton = computed(() => (!isAutoSyncEnabled.value || isFarmsSyncPage.value) && isOnline.value);
	const buttonText = computed(() => isFarmsSyncPage.value ? i18n.SAVE_BUTTON : i18n.SYNC_ALL_DATA_LABEL);

	const back = () => {
		isFarmsSyncPage.value = false;
	};

	const isButtonDisabled = computed(
		() => {
			if (!isFarmsSyncPage.value)
				return false;

			return !canAddFarmsToSync.value
				|| isFarmsSettingsSaving.value
				|| farmsStatus.value !== LoadingStatus.OK;
		}
	);

	const syncAllData = async () => {
		updateSyncProgressStatus({ draft: 0, farm: 0, dictionaries: 0, dictsImages: 0, weather: 0, dzzData: 0 });
		updateSyncStatus({
			draft: SyncStatus.IN_PROGRESS,
			farm: SyncStatus.IN_PROGRESS,
			dictionaries: SyncStatus.IN_PROGRESS,
			dictsImages: SyncStatus.IN_PROGRESS,
			weather: SyncStatus.IN_PROGRESS,
			dzzData: SyncStatus.IN_PROGRESS
		});
		await syncAll();
	};

	const clickSyncSettingsButton = () => isFarmsSyncPage.value
		? saveSelectedFarmsIds(tempSelectedFarmsIds.value)
		: syncAllData();

	const { state: farmsTotal } = useAsyncComputed({
		get: () => dataSource.getSyncFarmsTotal(),
		isExecutionAllowed: computed(() => isOnline.value && !isFarmsSyncPage.value),
		default: null,
		updateOn: selectedFarmsIds
	});

	/**
	 * FARM_SYNC_SETTINGS_CONTENT (GENERAL)
	 *****************************************/

	const totalSelectedFarmsArea = computed(
		() => (
			farms.value
				?.filter(({ id }) => isFarmSelected(id))
				?.reduce((sum, { totalArea }) => sum + (totalArea || 0), 0)
		) || 0
	);

	const totalAllAvailableFarmsArea = computed(
		() => (farms.value?.reduce((sum, { totalArea }) => sum + (totalArea || 0), 0)) || 0
	);

	const canAddFarmsToSync = computed(() => MAX_SYNC_FARM_AREA > totalSelectedFarmsArea.value);
	const showAllFarms = computed(
		() => totalAllAvailableFarmsArea.value < MAX_SYNC_FARM_AREA && farmsStatus.value === LoadingStatus.OK
	);

	/**
	 * SYNC_SETTINGS_CONTENT (AUTO_SYNC_SECTION)
	 *****************************************/
	// Загрузка фотографий справочников - опциональна, если добавляется - syncedDataCounter === 6.
	const syncDataCounter = computed(
		() => Object
			.values(syncStates.value)
			.filter((data: SyncStatusParameters) => data?.timestamp !== null)
			.length
	);

	const isAutoSyncInProgress = computed(
		() => showAutoSync.value && (syncInProgress.value || updateInProgress.value)
	);

	const autoSyncProgress = computed(
		() => {
			if (syncStates.value?.dictImages?.status === SyncStatus.IN_PROGRESS)
				return syncStates.value?.dictImages?.progress;

			const progress = Object
				.values(syncProgresses.value)
				.reduce((sum, value) => sum + (value || 0), 100);

			return progress / syncDataCounter.value;
		}
	);

	const isAllDataSynced = computed(
		() => Object
			.values(syncStates.value)
			.filter(({ timestamp, status }: SyncStatusParameters) => timestamp !== null && status === SyncStatus.DONE)
			.length === syncDataCounter.value
	);

	const isSyncError = computed(
		() => Object
			.values(syncStates.value)
			.filter((data: SyncStatusParameters) => [SyncStatus.ERROR, SyncStatus.NONE].includes(data?.status))
			.length
	);

	const autoSyncStatus = computed(
		() => {
			if (isAllDataSynced.value)
				return SyncStatus.DONE;

			if (isAutoSyncInProgress.value)
				return SyncStatus.IN_PROGRESS;

			if (isSyncError.value)
				return SyncStatus.ERROR;

			return SyncStatus.NONE;
		}
	);

	const farmsControlSublabel = computed(
		() => {
			if (selectedFarmsIds.value?.length && farmsTotal.value)
				return `${selectedFarmsIds.value?.length} ${i18n.OF_LABEL} ${farmsTotal.value}`;

			if (selectedFarmsIds.value?.length === farmsTotal.value)
				return i18n.ADVISER_ALL_FARMS_TITLE;

			return i18n.NO_SELECTED_FARMS_LABEL;
		}
	);

	const dictsImagesControlSublabel = `${i18n.ANALYTICS_VOLUME_LABEL}: 350 ${i18n.MEGABYTE_SHORT_LABEL}`;

	const confirmShouldSyncDictImages = async () => {
		if (!shouldSyncDictImages.value)
			return setShouldSyncDictImages(true);

		const shouldSync = await shouldConfirmDialog({
			text: i18n.DELETE_DICT_IMAGES_CONFIRM_TEXT,
			title: i18n.DELETE_DICT_IMAGES_CONFIRM_TITLE,
			confirmButtonLabel: i18n.TURN_OFF
		});

		if (shouldSync)
			await setShouldSyncDictImages(false);
	};

	const turnIsAutoSyncEnabled = (isEnabled: boolean) => {
		if (!isEnabled)
			cancelBackgroundSyncEverything();

		setIsAutoSyncEnabled(isEnabled);
	};

	const autoSyncControls = computed(
		() => [
			{
				value: i18n.AUTO_DATA_EXCHANGE_LABEL,
				sublabel: i18n.AUTO_DATA_EXCHANGE_SUBLABEL,
				isDisabled: syncInProgress.value,
				shouldShowSwitch: true,
				isActive: isAutoSyncEnabled.value,
				shouldShowBottomSlot: false,
				shouldShowArrow: false,
				bottomSlotText: '',
				change: (isEnabled: boolean) => turnIsAutoSyncEnabled(isEnabled)
			},
			isAutoSyncEnabled.value && {
				value: i18n.WIFI_ONLY_LABEL,
				sublabel: i18n.WIFI_ONLY_SUBLABEL,
				isDisabled: syncInProgress.value,
				shouldShowSwitch: true,
				shouldShowArrow: false,
				isActive: isWifiOnly.value,
				change: (isEnabled: boolean) => setIsWifiOnly(isEnabled)
			},
			!configs.isMobile && isOnline.value && { // TODO Включить в мобильной версии, когда появятся справочники с фото
				value: i18n.SAVE_PHOTO_FROM_DICTS_LABEL,
				sublabel: i18n.SAVE_PHOTO_FROM_DICTS_SUBLABEL,
				isDisabled: syncInProgress.value,
				shouldShowSwitch: true,
				shouldShowArrow: false,
				isActive: shouldSyncDictImages.value,
				shouldShowBottomSlot: true,
				bottomSlotText: dictsImagesControlSublabel.value,
				change: () => confirmShouldSyncDictImages()
			},
			isOnline.value && {
				value: i18n.SAVE_FARMS_DATA_LABEL,
				sublabel: i18n.SAVE_FARMS_DATA_SUBLABEL,
				isDisabled: syncInProgress.value,
				shouldShowSwitch: false,
				shouldShowBottomSlot: true,
				shouldShowArrow: true,
				bottomSlotText: farmsControlSublabel.value,
				click: () => goToFarmsSyncSettings()
			}
		].filter(Boolean)
	);

	const goToFarmsSyncSettings = () => {
		isFarmsSyncPage.value = true;
		resetFarmSyncSettingsContentData();
	};

	/**
	 * SYNC_SETTINGS_CONTENT (MANUAL_SYNC_SECTION)
	 *****************************************/
	const hasDraftsToSync = computed(
		() => Object
			.values(draftsQuantity.value)
			.filter(draftQuantity => draftQuantity > 0)
			.length > 0
	);

	const manualSyncControls = computed(
		() => [
			{
				value: i18n.UPLOAD_DATA_FROM_DEVICE_LABEL,
				sublabel: i18n.ADDED_OFFLINE_FARM_DATA_LABEL,
				hasDataToSync: hasDraftsToSync.value,
				progress: syncStates.value?.draft?.progress,
				status: syncStates.value?.draft?.status,
				timestamp: syncStates.value?.draft?.timestamp,
				isDrafts: true,
				syncData: () => syncOfflineUserData(),
				cancelSyncData: () => cancelOfflineDataSync()
			},
			{
				value: i18n.FARMS_DATA_LABEL,
				sublabel: i18n.ACTUAL_DATA_FOR_FARMS_TITLE,
				hasDataToSync: !!syncChanges.value?.farmIds?.length || syncChanges.value?.general,
				progress: syncStates.value?.farm?.progress,
				status: syncStates.value?.farm?.status,
				timestamp: syncStates.value?.farm?.timestamp,
				syncData: () => syncGeneralAndFarmsData(),
				cancelSyncData: () => cancelGeneralAndFarmsDataSync()
			},
			{
				value: i18n.TEXT_DICTS_DATA_LABEL,
				sublabel: i18n.DICTS_IMAGES_DOWNLOADS_SEPARATELY_LABEL,
				hasDataToSync: syncChanges.value?.dicts,
				progress: syncStates.value?.dictionaries?.progress,
				status: syncStates.value?.dictionaries?.status,
				timestamp: syncStates.value?.dictionaries?.timestamp,
				syncData: () => syncDicts(),
				cancelSyncData: () => cancelDictionariesDataSync()
			},
			shouldSyncDictImages.value && {
				value: i18n.DICTS_PHOTO_LABEL,
				sublabel: i18n.DICTS_PHOTO_PHENOPHASE_HARMFUL_OBJECTS_LABEL,
				hasDataToSync: syncChanges.value?.dictsImages,
				progress: syncStates.value?.dictImages?.progress,
				status: syncStates.value?.dictImages?.status,
				timestamp: syncStates.value?.dictImages?.timestamp,
				syncData: () => syncDictsImages(),
				cancelSyncData: () => cancelDictImagesSync()
			},
			{
				value: i18n.ACTUAL_DATA_FOR_WEATHER_TITLE,
				sublabel: i18n.WEATHER_DATA_DOWNLOAD_PERIOD_LABEL,
				hasDataToSync: !!syncChanges.value?.weatherFarmIds?.length,
				progress: syncStates.value?.weather?.progress,
				status: syncStates.value?.weather?.status,
				timestamp: syncStates.value?.weather?.timestamp,
				syncData: () => syncWeather(),
				cancelSyncData: () => cancelWeatherDataSync()
			},
			{
				value: i18n.SCENES_NDVI_LABEL,
				sublabel: i18n.NDVI_DOWNLOAD_CONDITION_LABEL,
				hasDataToSync: !!syncChanges.value?.dzzFarmIds?.length,
				progress: syncStates.value?.dzzData?.progress,
				status: syncStates.value?.dzzData?.status,
				timestamp: syncStates.value?.dzzData?.timestamp,
				syncData: () => syncFarmDzzData(),
				cancelSyncData: () => cancelFarmDzzDataSync()
			}
		].filter(Boolean)
	);

	/**
	 * FARM_SYNC_SETTINGS_CONTENT (GENERAL)
	 *****************************************/

	const isFarmsSettingsSaving = ref(false);
	const isFarmSelected = (farmId: string) => tempSelectedFarmsIds.value.includes(farmId);

	const getFarmControlSublabel = (farm: SyncFarm) => {
		const { district, totalFields, totalArea } = farm;
		let resultSublabel = '';
		if (district)
			resultSublabel = resultSublabel + district;

		if (totalFields)
			resultSublabel = `${resultSublabel}, ${getTotalFarmFieldsLabel(totalFields)}`;

		if (totalArea)
			resultSublabel = `${resultSublabel}, ${totalArea} ${i18n.GA_LABEL}`;

		return resultSublabel;
	};

	const selectFarmId = (event: Event, farmId: string, index?: number) => {
		farmControl.value = event.currentTarget;
		farmControlIndex.value = index;

		if (tempSelectedFarmsIds.value.includes(farmId))
			tempSelectedFarmsIds.value = tempSelectedFarmsIds.value?.filter(id => id !== farmId);
		else
			tempSelectedFarmsIds.value.push(farmId);
	};

	const farmsDisplayData = computed(
		() => (farms.value ?? [])
			.map(farm => ({
				disabled: isFarmsSettingsSaving.value || (!canAddFarmsToSync.value && !isFarmSelected(farm.id)),
				sublabel: getFarmControlSublabel(farm),
				name: farm.name,
				legalName: farm.legalName,
				selected: isFarmSelected(farm.id),
				select: (event: Event, index: number) => selectFarmId(event, farm.id, index)
			}))
	);

	const selectAllFarms = async () => {
		if (isFarmsSettingsSaving.value)
			return;

		if (tempSelectedFarmsIds.value.length > 0)
			tempSelectedFarmsIds.value = [];
		else
			tempSelectedFarmsIds.value = (farms.value || []).map(({ id }) => id);
	};

	const getTotalFarmFieldsLabel = (totalFields: number) =>
		formatLocalizedString(i18n.FIELDS_FILTER_PLURAL_LABEL, { count: totalFields });

	const resetFarmSyncSettingsContentData = () => {
		farmControl.value = undefined;
		tempSelectedFarmsIds.value = [...selectedFarmsIds.value || []];
	};

	const saveSelectedFarmsIds = async (farmIds: Maybe<string[]>) => {
		isFarmsSettingsSaving.value = true;
		await updateSyncSettings(farmIds);
		back();
		isFarmsSettingsSaving.value = false;
	};

	//TODO: Сделано без VS, так как список хозяйств априори не должен быть большим
	// Перевести на Infinite Scroller, когда он будет сделан
	const { state: farms, status: farmsStatus } = useAsyncComputed({
		get: () => dataSource.listSyncFarms(),
		isExecutionAllowed: computed(() => isOnline.value && isFarmsSyncPage.value),
		default: null,
		updateOn: selectedFarmsIds
	});

	/**
	 * MOBILE_SYNC_SETTINGS
	 **********************************************************************************/

	const updateTime = computed(() => {
		if (!autoSyncTiming.value)
			return null;

		return utcToLocalDate(dateFrom(autoSyncTiming.value));
	});

	const lastTimeSync = useHumanTimeDifference(updateTime);

	const mobileSyncStatusText = computed(
		() => {
			switch (autoSyncStatus.value) {
				case SyncStatus.DONE:
					return `${i18n.ALL_DATA_IS_ACTUAL_LABEL} (${lastTimeSync.value})`;
				case SyncStatus.IN_PROGRESS:
					return i18n.SYNC_IN_PROGRESS_LABEL;
				case SyncStatus.ERROR:
					return i18n.ERROR_DATA_DOWNLOAD_LABEL;
				default:
					return hasAnythingToSync.value ? i18n.HAVE_DATA_TO_SYNC_LABEL : '';
			}
		}
	);

	const mobileHeaderSubtitle = computed(
		() => isAutoSyncEnabled.value && isOnline.value
			? mobileSyncStatusText.value
			: ''
	);

	const mobileBack = () => isFarmsSyncPage.value ? back() : closeSyncSettings();

	/**
	 *************************************************************************************/

	// Убирает попап с настройками, т.к он накладывается на окно ошибки
	watch(hasSpaceOnDevice, hasSpaceOnDevice => !hasSpaceOnDevice && closeSyncSettings());

	// Обновляет временные избранные хоз-ва при авто-синхронизации
	watch(
		selectedFarmsIds,
		selectedFarmsIds => {
			tempSelectedFarmsIds.value = selectedFarmsIds || [];
		}
	);

	// Если включен offline-режим, переносит пользователя на главный экран настроек синхронизации
	watch(
		offlineModeIsOn,
		offlineModeIsOn => offlineModeIsOn
			&& isFarmsSyncPage.value
			&& back()
	);

	const state = {
		// GENERAL_SYNC_SETTINGS
		isSyncSettingOpened,
		isButtonDisabled,
		isOnline,
		showAutoSync,
		showManualSync,
		syncSettingsHeaderText,
		canShowButton,
		buttonText,
		clickSyncSettingsButton,
		back,
		closeSyncSettings,

		// AUTO_SYNC_SECTION
		isAutoSyncEnabled,
		isWifiOnly,
		shouldSyncDictImages,
		isAutoSyncInProgress,
		autoSyncProgress,
		hasAnythingToSync,
		autoSyncStatus,
		farmsControlSublabel,
		dictsImagesControlSublabel,
		autoSyncControls,
		autoSyncTiming,
		cancelBackgroundSyncEverything,

		// MANUAL_SYNC_SECTION
		manualSyncControls,
		syncAllData,

		// FARMS_SYNC_SECTION
		farms,
		farmsDisplayData,
		farmsStatus,
		scroller,
		farmControl,
		farmControlIndex,
		isFarmsSyncPage,
		selectedFarmsIds,
		canAddFarmsToSync,
		showAllFarms,
		tempSelectedFarmsIds,
		isFarmsSettingsSaving,
		goToFarmsSyncSettings,
		selectAllFarms,

		// MOBILE_SYNC_SETTINGS
		mobileSyncStatusText,
		mobileHeaderSubtitle,
		mobileBack,

		// ENUMS
		IconName,
		SyncStatus,
		BaseStickyPopupPosition,
		ButtonForm,
		ButtonView,
		BaseSwitchSize,
		BaseSwitchView,
		NotifyLineSize,
		NotifyLineView,
		NotifyLineAlign
	};

	provide(key, state);

	return state;
}
