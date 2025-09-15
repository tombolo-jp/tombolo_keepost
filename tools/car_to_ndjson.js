#!/usr/bin/env node

import { CarReader } from '@ipld/car'
import { decode } from '@ipld/dag-cbor'
import fs from 'fs'
import path from 'path'

async function car_to_ndjson(input_path, output_path) {
  console.log(`Converting CAR file: ${input_path}`)
  console.log(`Output will be saved to: ${output_path}`)
  
  try {
    // CARファイルを読み込み
    const car_bytes = fs.readFileSync(input_path)
    const reader = await CarReader.fromBytes(new Uint8Array(car_bytes))
    
    // 出力ストリームを開く
    const output_stream = fs.createWriteStream(output_path)
    
    // 統計情報
    let total_blocks = 0
    let post_count = 0
    let repost_count = 0
    let profile_count = 0
    let other_count = 0
    
    // ユーザー情報を保持
    let user_info = {
      handle: null,
      did: null,
      profile: null
    }
    
    // ルート情報を取得
    const roots = await reader.getRoots()
    console.log(`Found ${roots.length} root(s)`)
    
    // ルートからDIDを取得
    for (const root of roots) {
      try {
        const root_block = await reader.get(root)
        if (root_block) {
          const root_data = decode(root_block.bytes)
          if (root_data && root_data.did) {
            user_info.did = root_data.did
            console.log(`Found DID: ${user_info.did}`)
          }
        }
      } catch (e) {
        // ルートのデコードエラーは無視
      }
    }
    
    // 全ブロックを処理
    console.log('\nProcessing blocks...')
    for await (const { cid, bytes } of reader.blocks()) {
      total_blocks++
      
      try {
        // CBORデータをデコード
        const data = decode(bytes)
        
        // データ型を確認
        if (data && data.$type) {
          const entry = {
            cid: cid.toString(),
            type: data.$type,
            data: data,
            metadata: {
              block_number: total_blocks,
              extracted_at: new Date().toISOString()
            }
          }
          
          // プロフィール情報
          if (data.$type === 'app.bsky.actor.profile') {
            profile_count++
            user_info.profile = data
            if (data.handle) {
              user_info.handle = data.handle
            }
            entry.metadata.user_info = user_info
          }
          
          // ポスト
          else if (data.$type === 'app.bsky.feed.post') {
            post_count++
            entry.metadata.post_index = post_count
            
            // テキストの抽出
            if (data.text) {
              entry.metadata.text_preview = data.text.substring(0, 100)
            }
            
            // メディアの有無
            if (data.embed) {
              entry.metadata.has_media = true
              if (data.embed.$type) {
                entry.metadata.embed_type = data.embed.$type
              }
            }
          }
          
          // リポスト
          else if (data.$type === 'app.bsky.feed.repost') {
            repost_count++
            entry.metadata.repost_index = repost_count
          }
          
          // その他のタイプ
          else {
            other_count++
          }
          
          // NDJSONとして出力（1行1オブジェクト）
          output_stream.write(JSON.stringify(entry) + '\n')
        }
        
        // 進捗表示
        if (total_blocks % 100 === 0) {
          process.stdout.write(`\rProcessed ${total_blocks} blocks (Posts: ${post_count}, Reposts: ${repost_count})`)
        }
        
      } catch (decode_error) {
        // デコードできないブロックはスキップ（バイナリデータなど）
      }
    }
    
    output_stream.end()
    
    // 統計情報を表示
    console.log('\n\n=== Conversion Complete ===')
    console.log(`Total blocks processed: ${total_blocks}`)
    console.log(`Posts found: ${post_count}`)
    console.log(`Reposts found: ${repost_count}`)
    console.log(`Profile records: ${profile_count}`)
    console.log(`Other records: ${other_count}`)
    if (user_info.handle) {
      console.log(`User handle: ${user_info.handle}`)
    }
    if (user_info.did) {
      console.log(`User DID: ${user_info.did}`)
    }
    console.log(`\nOutput saved to: ${output_path}`)
    
  } catch (error) {
    console.error('Error converting CAR file:', error.message)
    process.exit(1)
  }
}

// コマンドライン引数の処理
if (process.argv.length < 3) {
  console.log('Usage: node car_to_ndjson.js <input.car> [output.ndjson]')
  console.log('\nExample:')
  console.log('  node car_to_ndjson.js bluesky.car')
  console.log('  node car_to_ndjson.js bluesky.car bluesky_posts.ndjson')
  process.exit(1)
}

const input_file = process.argv[2]
const output_file = process.argv[3] || input_file.replace(/\.car$/i, '') + '.ndjson'

// ファイルの存在確認
if (!fs.existsSync(input_file)) {
  console.error(`Error: Input file not found: ${input_file}`)
  process.exit(1)
}

// 変換実行
car_to_ndjson(input_file, output_file)