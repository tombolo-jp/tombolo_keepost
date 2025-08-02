// ベースパスを取得（Viteの環境変数から）
export const BASE_PATH = import.meta.env.BASE_URL || '/'

// 相対パスをベースパスと結合
export function with_base_path(path) {
  // pathが/で始まる場合は除去
  const clean_path = path.startsWith('/') ? path.slice(1) : path
  // ベースパスと結合（ベースパスは末尾に/を含む）
  return BASE_PATH + clean_path
}