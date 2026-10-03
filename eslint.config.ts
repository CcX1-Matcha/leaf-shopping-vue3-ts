import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import {
  defineConfigWithVueTs,
  vueTsConfigs
} from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import pluginPrettier from 'eslint-plugin-prettier'

// 支持.vue文件中的更多脚本语言
import { configureVueProject } from '@vue/eslint-config-typescript'
configureVueProject({ scriptLangs: ['ts', 'tsx'] })

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,ts,mts,tsx,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  js.configs.recommended,
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  // 自定义规则配置
  {
    name: 'app/custom-rules',
    files: ['**/*.{js,mjs,jsx,ts,mts,tsx,vue}'],
    plugins: {
      prettier: pluginPrettier
    },
    rules: {
      // Prettier相关规则
      'prettier/prettier': [
        'warn',
        {
          singleQuote: true,
          semi: false,
          printWidth: 80,
          trailingComma: 'none',
          endOfLine: 'auto'
        }
      ],
      // Vue组件命名规则
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index']
        }
      ],
      // 关闭props解构校验
      'vue/no-setup-props-destructure': ['off'],
      // 未定义变量错误提示
      'no-undef': 'error',
      // TypeScript特有规则
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
    },
    // 关键修改：将globals移到languageOptions内部
    languageOptions: {
      globals: {
        ElMessage: 'readonly',
        ElMessageBox: 'readonly',
        ElLoading: 'readonly'
      }
    }
  }
)
