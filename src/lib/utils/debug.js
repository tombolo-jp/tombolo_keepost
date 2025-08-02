// デバッグユーティリティ
// 開発環境でのみデバッグログを出力する

const is_dev = import.meta.env.DEV

export function debug_log(label, ...args) {
  if (is_dev) {
    // console.$1(label, ...args)
  }
}

export function debug_error(label, ...args) {
  if (is_dev) {
    // console.$1(label, ...args)
  }
}

export function debug_warn(label, ...args) {
  if (is_dev) {
    // console.$1(label, ...args)
  }
}