/**
 * Preset Media Library — Kandes.shop
 * 
 * Kho ảnh bản quyền AI Tools phục vụ chọn ảnh cho sản phẩm nhanh chóng trong trang quản trị Admin.
 */

export interface PresetImage {
  id: string
  title: string
  category: 'cursor' | 'claude' | 'openai' | 'copilot' | 'windsurf' | 'jetbrains' | 'deepseek' | 'gateway' | 'other'
  url: string
  altText: string
  badgeText?: string
  description?: string
}

export const PRESET_PRODUCT_IMAGES: PresetImage[] = [
  {
    id: 'cursor-pro',
    title: 'Cursor Pro AI Editor',
    category: 'cursor',
    url: '/assets/products/cursor-pro.svg',
    altText: 'Cursor Pro AI Code Editor Cover',
    badgeText: 'HOT / BÁN CHẠY',
    description: 'Ảnh bìa nhận diện Cursor Pro AI Editor (400 req/ngày)',
  },
  {
    id: 'claude-code',
    title: 'Anthropic Claude Code Agent',
    category: 'claude',
    url: '/assets/products/claude-code.svg',
    altText: 'Claude Code Agent Cover',
    badgeText: 'SONNET 3.5 & OPUS',
    description: 'Ảnh bìa Anthropic Claude Code Agent CLI & Web',
  },
  {
    id: 'codex-gpt',
    title: 'OpenAI Codex GPT / ChatGPT Plus',
    category: 'openai',
    url: '/assets/products/codex-gpt.svg',
    altText: 'OpenAI Codex GPT Cover',
    badgeText: 'GPT-4O / O1',
    description: 'Ảnh bìa OpenAI Codex & ChatGPT Plus bản quyền',
  },
  {
    id: 'github-copilot',
    title: 'GitHub Copilot Enterprise',
    category: 'copilot',
    url: '/assets/products/github-copilot.svg',
    altText: 'GitHub Copilot Cover',
    badgeText: 'VS CODE & JETBRAINS',
    description: 'Ảnh bìa GitHub Copilot AI Pair Programmer',
  },
  {
    id: 'windsurf',
    title: 'Codeium Windsurf Cascade',
    category: 'windsurf',
    url: '/assets/products/windsurf.svg',
    altText: 'Windsurf Cascade IDE Cover',
    badgeText: 'CASCADE AGENT',
    description: 'Ảnh bìa Codeium Windsurf AI IDE',
  },
  {
    id: 'jetbrains-ai',
    title: 'JetBrains AI Assistant',
    category: 'jetbrains',
    url: '/assets/products/jetbrains-ai.svg',
    altText: 'JetBrains AI Assistant Cover',
    badgeText: 'ALL IDES',
    description: 'Ảnh bìa JetBrains AI Assistant cho IntelliJ, WebStorm, PyCharm',
  },
  {
    id: 'deepseek-r1',
    title: 'DeepSeek R1 Reasoning',
    category: 'deepseek',
    url: '/assets/products/deepseek-r1.svg',
    altText: 'DeepSeek R1 Cover',
    badgeText: 'REASONING',
    description: 'Ảnh bìa DeepSeek R1 & V3 AI Reasoning',
  },
  {
    id: 'openrouter',
    title: 'OpenRouter AI Gateway',
    category: 'gateway',
    url: '/assets/products/openrouter.svg',
    altText: 'OpenRouter AI Gateway Cover',
    badgeText: '200+ MODELS',
    description: 'Ảnh bìa OpenRouter AI Gateway API Credit',
  },
]
