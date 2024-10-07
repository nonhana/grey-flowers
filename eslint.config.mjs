// eslint.config.mjs
import antfu from '@antfu/eslint-config'
import tailwind from 'eslint-plugin-tailwindcss'

export default antfu({}, ...tailwind.configs['flat/recommended'])
