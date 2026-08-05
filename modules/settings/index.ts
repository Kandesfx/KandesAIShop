/**
 * Settings module barrel — P4-06.
 */

export { settingsService, getCategoryDef, listCategoryKeys } from './service'
export type { SettingCategoryKey, SettingFieldDef, CategoryView } from './types'
export { SETTINGS_REGISTRY } from './registry'
export {
  buildCategorySchema,
  settingsCategoryParamSchema,
  testEmailSchema,
  testTelegramSchema,
  seedSettingsSchema,
} from './validators'
