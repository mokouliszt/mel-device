# @mokouliszt/mel-device

[English](README.md)

三菱電機 MELSEC / MXコントローラ、MELFAロボットコントローラ、およびFRインバータのシーケンス機能のデバイス表記を、シリーズとCPU／コントローラ／インバータ型名を含めて検証する、依存ライブラリなしのnpmパッケージです。

対応シリーズは iQ-R、iQ-F、MX-R、MX-F、CR800-R/D/Q、および FR-A800／A800 Plus／F800／E800 シーケンス機能です。ES Modules と CommonJS の両方から利用できます。

## インストール

```bash
npm install @mokouliszt/mel-device
```

## 基本的な使い方

```js
import { isValidDevice, analyzeDevice } from "@mokouliszt/mel-device";

isValidDevice("X0", {
  series: "iQ-R",
  model: "R00"
}); // true（R00CPU に正規化）

isValidDevice("D0.A", {
  series: "iQ-F",
  model: "FX5S"
}); // true

analyzeDevice("D12288", {
  series: "iQ-R",
  model: "R00",
  mode: "default"
});
// {
//   valid: false,
//   code: "REQUIRES_CONFIGURATION",
//   suggestedMode: "maximum",
//   ...
// }

isValidDevice("U3E0\\G524287", {
  series: "CR800-R"
}); // true（modelはseriesから推論）
```

`analyzeDevice` は、単なる `true` / `false` ではなく、正規化後の型名、解釈したデバイス、失敗理由、参照マニュアルとページ、実機設定への依存有無を返します。入力欄のバリデーションにはこちらを推奨します。

`model`を省略できるのは、`series`に`CR800-R`、`CR800-D`、`CR800-Q`、`FR-A800`、`FR-F800`、`FR-E800`のような単一機種のショートハンドを直接指定した場合です。`iQ-R`、`iQ-F`、`MX-R`、`MX-F`、`CR800`、`FR800`では従来どおり型名を指定してください。

## 判定モード

PLCのM/D等はCPUパラメータで点数を変更できるため、型名だけで実機上の有効範囲を断定できない場合があります。本パッケージは、この違いをモードで明示します。

| `mode` | 用途 | 動作 |
| --- | --- | --- |
| `default` | 安全側の通常判定（既定） | マニュアル記載のデフォルト点数で判定。iQ-Fは添付マニュアルにデフォルト点数表がないため、機種別「使用範囲」で判定し `configurationDependent: true` を返します。 |
| `maximum` | 設計・設定画面 | マニュアル記載の変更可能上限で判定。メモリ、ラベル使用量、拡張SRAM等で実際の上限が下がる場合があります。 |
| `configured` | 実機プロジェクトの厳密判定 | `configuredPoints` に渡した実際の点数で判定。可変デバイスの点数が未指定なら `MISSING_CONFIGURATION`。 |
| `syntax` | エディタ入力途中・構文チェック | 型名が対応するデバイス文法のみを確認し、点数範囲を無視。 |

CR800-R/D/QおよびFRインバータのデバイス範囲はマニュアル上固定されているため、これらのシリーズでは`configuredPoints`を参照しません。ただしインバータでは、`maximum`が後述のSERIAL依存のT/ST/C 32点拡張を許可する点だけが異なります。

```js
isValidDevice("D99", {
  series: "MX-F",
  model: "MXF100",
  mode: "configured",
  configuredPoints: { D: 100 }
}); // true

isValidDevice("D100", {
  series: "MX-F",
  model: "MXF100",
  mode: "configured",
  configuredPoints: { D: 100 }
}); // false（100点はD0〜D99）
```

## 入力モード

`inputMode: "exact"` が既定です。大文字、半角、マニュアルどおりの `\` を要求します。

UIで人が入力する場合は `friendly` が便利です。前後空白、小文字、全角英数字、`¥` / `￥` を正規化します。

```js
analyzeDevice("  u1￥g0  ", {
  series: "iQ-F",
  model: "FX5U",
  inputMode: "friendly"
}).normalized; // "U1\\G0"
```

## 対応する主な表記

- 直接デバイス: `X0`, `DX0`, `DY0`, `M0`, `D0`, `W0`, `SM400`
- ワードデバイスのビット指定: `D0.A`
- タイマ／カウンタの接点・コイル・現在値: `TS0`, `TC0`, `TN0`, `LCS0` など
- ユニットアクセス: `U1\G0`
- CPUバッファメモリアクセス: `U3E0\G0`, `U3E0\HG0`
- リンクダイレクト: `J1\X0`, `J1\W0`
- 桁指定: `K4M100`
- 間接指定: `@D10`, `@D10.8`
- インデックス修飾: `D10Z2.0`, `D10.8Z2`, `D0LZ0`
- ローカルデバイス: `#M0`（対応シリーズ／デバイスのみ）

### ユニットアクセス／CPUバッファメモリアクセスの範囲

先頭入出力番号、CPU指定、アドレスをそれぞれマニュアル記載の範囲で判定します。バッファメモリ領域 `G` と定周期通信エリア `HG` は上限が別で、`HG` はMX-R／MX-Fのマニュアルには記載がありません。

| シリーズ | `Un\G` 先頭入出力番号 | `U3En\G` | `U3En\HG` |
| --- | --- | --- | --- |
| iQ-R | `U00`〜`UFF` | `U3E0`〜`U3E3`、アドレス `0`〜`268435455` | `U3E0`〜`U3E3`、アドレス `0`〜`12287` |
| iQ-F | マニュアルに記載なし（判定しない） | 非対応 | 非対応 |
| MX-R | `U00`〜`UFF` | `U3E0`、アドレス `0`〜`524287` | マニュアルに記載なし |
| MX-F | `U01`〜`UFE` | `U3E0`、アドレス `0`〜`16809983` | マニュアルに記載なし |

CR800は独自の固定テーブルで判定します（下記参照）。

## MELFA CR800

推奨表記は、親シリーズとコントローラ種別を分ける方法です。

```js
analyzeDevice("U3E1\\HG100", {
  series: "CR800",
  model: "CR800-D",
  operation: "write"
});
// valid: true（デバイス表記としては有効）
// access: "read-only"
// operationAllowed: false（この領域は常時有効のシーケンサリンク入力）
```

`series: "CR800-R"`、`"CR800-D"`、`"CR800-Q"`の省略形も使用でき、この場合は`model`を省略できます。モデルには`R`、`D`、`Q`も指定できます。

| モデル | 対応デバイスと固定範囲 |
| --- | --- |
| CR800-R | `X0-XFFF`, `Y0-YFFF`, `M0-M18431`, `D0-D5119`, `SM0-SM4095`, `SD0-SD4095`, `U3E0-U3E3\G0-G524287`, `U3E0-U3E3\HG0-HG12287` |
| CR800-D | `X0-X1FFF`, `Y0-Y1FFF`, `D0-D5119`, `SM0-SM4095`, `SD0-SD4095`, `U3E0/U3E1\HG0-HG2047` |
| CR800-Q | `X0-XFFF`, `Y0-YFFF`, `M0-M18431`, `D0-D5119`, `SM0-SM2047`, `SD0-SD2047`, `U3E0-U3E3\G10000-G24335` |

### 読書き属性の判定

取扱説明書の表6-14～6-16では、固定範囲内でも機能の割付中は読出し専用となり、書込みが無視される領域があります。`isValidDevice`は「デバイス表記と固定範囲」を判定し、`analyzeDevice`はそれとは別に次を返します。

- `access`: `read-write` / `read-only` / `configuration-dependent`
- `operationAllowed`: `operation: "read" | "write"`に対する`true` / `false`。構成不明時は`null`
- `activeAllocations`, `possibleAllocations`, `warnings`: 判定根拠となった割付

実機設定が分かる場合は`cr800Features`を渡せます。省略した項目は「不明」として安全側に`configuration-dependent`を返します。

```js
analyzeDevice("U3E1\\HG600", {
  series: "CR800-D",
  operation: "write",
  cr800Features: { iqmem: false }
}).operationAllowed; // true（拡張機能無効時は自由に読書き可能）

analyzeDevice("U3E1\\HG600", {
  series: "CR800-D",
  operation: "write",
  cr800Features: { iqmem: true }
}).operationAllowed; // false
```

指定可能な設定は次のとおりです。

| `cr800Features` | 対象 | 意味 |
| --- | --- | --- |
| `qxyread` | R/Q | シーケンサ入出力ユニット直接制御 |
| `iqmem` | R/D/Q | CPUバッファ／共有メモリ拡張 |
| `ddevvl` | R/D/Q | `"disabled"`, `"program-external"`, `"status"`, `"mixed"` |
| `parallelIoUnit`, `parallelIoInterface`, `gotLink` | D | パラレルI/O、GOTリンク |
| `profibus`, `ccLink`, `ccLinkIef` | D | 各ネットワーク機能 |

常時有効の例として、CR800-Dの`U3E1\HG0-HG511`、CR800-Rの`U3E1-U3E3\HG0-HG511`、CR800-Qの`U3E1-U3E3\G10000-G10511`は外部機器から読出し専用です。ハンド入力`X384-X38B`も読出し専用です。一方、機能が無効または未割付の領域は、マニュアル注記どおり自由に読書きできます。

CR800-Qの表6-16にある`U3En\G512-G1023`は、表6-13の固定範囲`G10000-G24335`および5.2.1／6.2.2の対応表と矛盾します。本パッケージは誤った有効判定を避けるため、この表記を`MANUAL_RANGE_CONFLICT`として無効にし、`G10512-G11023`側のIQMEM読書き属性も断定せず`configuration-dependent`とします。

表6-11～6-13に記載されていないビット指定、桁指定、間接指定、インデックス修飾、ローカル指定は、CR800では保守的に無効と判定します。

定数（`K100`, `HFF`, 実数・文字列）は「デバイス」ではないため判定対象外です。ラベル、構造体メンバ、SLMPのバイナリデバイスコードも対象外です。

## FRインバータ シーケンス機能

FR-A800／A800 Plus／F800／E800のシーケンス機能はデバイステーブルが1種類に固定されているため、シリーズを`FR800`、インバータのファミリを型名として扱います。単一ファミリのショートハンドを`series`に直接指定した場合は`model`を省略できます。

```js
isValidDevice("X8F", { series: "FR-A800" }); // true（Xは16進で144点）
isValidDevice("X90", { series: "FR-A800" }); // false

analyzeDevice("P100", { series: "FR-E800" });
// valid: true, configurationDependent: true（PデバイスはSERIALの製造年月に依存）

analyzeDevice("P100", { series: "FR-A800" }).code; // "DEVICE_NOT_SUPPORTED"
```

| デバイス | FR-A800 / FR-A800 Plus / FR-F800 | FR-E800 | 基数 |
| --- | --- | --- | --- |
| X、Y | `X0～X8F`、`Y0～Y8F`（各144点） | 同左 | 16進 |
| M | `M0～M127` | 同左 | 10進 |
| L | 点数なし（シーケンスパラメータで設定可能だがラッチしない） | 同左 | - |
| T、ST、C | `0～15`、または下記拡張で`0～31` | `0～15` | 10進 |
| D | `D0～D255` | 同左 | 10進 |
| P | 記載なし | `P0～P127`、`P2048～P2175` | 10進 |
| SM、SD | `0～2047`（機能制限あり） | 同左 | 10進 |
| N | `N0～N14`（MC/MCRのネスティング） | 同左 | 10進 |

### SERIAL（製造年月）依存機能

マニュアルには、インバータ定格名板のSERIALが示す製造年月によって対応可否が変わるデバイス機能が2つ記載されています。型名だけでは断定できないため、暗黙に許可せず別扱いで返します。

```js
analyzeDevice("T16", { series: "FR-A800" });
// valid: false, code: "REQUIRES_SERIAL_SUPPORT", suggestedMode: "maximum"

isValidDevice("T16", { series: "FR-A800", mode: "maximum" });                            // true（設定依存）
isValidDevice("T16", { series: "FR-A800", frFeatures: { extendedTimerPoints: true } });  // true（確定）
isValidDevice("T16", { series: "FR-A800", frFeatures: { extendedTimerPoints: false } }); // false
```

| `frFeatures` | 対象 | 意味 |
| --- | --- | --- |
| `extendedTimerPoints` | FR-A800、FR-A800-CRN、FR-A800-LC、FR-F800 | T/ST/Cの32点対応 |
| `pointerDevice` | FR-E800系 | Pデバイス256点対応 |

マニュアルが対応と記載していない型名に対して`true`を指定した場合は、範囲を黙って広げず`INVALID_FR_FEATURES`を返します。

### 桁指定と入力デバイス

桁指定はビットデバイスX、Y、Mのみに記載があります。本パッケージは、指定した点数がデバイス範囲内に収まるかも判定します。

```js
isValidDevice("K4X80", { series: "FR-A800" });            // true（X80～X8F）
analyzeDevice("K4X8C", { series: "FR-A800" }).code;       // "DIGIT_RANGE_OVERFLOW"
analyzeDevice("K4D0", { series: "FR-A800" }).code;        // "DIGIT_MODIFIER_NOT_SUPPORTED"
```

入力デバイスXは毎スキャン外部端子やネットワークからリフレッシュされるため、プログラムから駆動できません。`analyzeDevice`はCR800と同じフィールドでこれを返します。

```js
analyzeDevice("X0", { series: "FR-A800", operation: "write" });
// valid: true, access: "read-only", operationAllowed: false
// warnings: インバータ運転状態制御にはSM1200/SM1255、SD1148/SD1149を使用する旨
```

X/Yの`30H`以降はCC-Linkリモート入出力（`30H～3FH`）とEthernetインバータ間リンク入出力（`40H～8FH`）の領域であるため、領域名を含む警告とともに`configurationDependent: true`を返します。

ビット指定、間接指定、インデックス修飾、ローカルデバイス、ユニットアクセス、および`TS`/`TC`/`TN`形式の接点・コイル・現在値表記は、シーケンス機能のマニュアルに記載がないため保守的に無効とします。

## API

### `isValidDevice(value, options): boolean`

簡潔な真偽値判定です。

### `analyzeDevice(value, options): DeviceAnalysis`

詳細判定です。主要な返却値は `valid`, `code`, `message`, `normalized`, `parsed`, `configurationDependent`, `source` です。

### `assertValidDevice(value, options): DeviceAnalysis`

無効時に `MelDeviceError` を投げます。

### `parseDevice(value, options): ParsedDevice | null`

構文を分解します。シリーズ／機種の範囲判定は行いません。

### `normalizeDevice(value): string | null`

人間向け表記を正規化します。

### `normalizeModel(series, model): string | null`

`R00` → `R00CPU`、iQ-Fの具体的な型名 → `FX5U` のように、検証用の型名へ正規化します。

### `getSupportedModels(series): string[]`

マニュアルの対象機種一覧を返します。

## 対象機種

- iQ-R: R00CPU、R01CPU、R02CPU、R04/R08/R16/R32/R120 CPUおよびENCPU
- iQ-F: FX5S、FX5UJ、FX5U、FX5UC（具体的なI/O型名もファミリへ正規化）
- MX-R: MXR300-16/-32/-64、MXR500-128/-256
- MX-F: MXF100系のマニュアル対象10機種（`MXF100` をファミリ別名として受付）
- MELFA CR800: CR800-R、CR800-D、CR800-Q
- FRインバータ（`FR800`）: FR-A800、FR-A800-P、FR-A800-CRN、FR-A800-LC、FR-A800-Plus、FR-F800、FR-E800、FR-E800-E、FR-E800-SCE、FR-E800-NC、FR-E806

## 資料

判定表は、同梱の [manual-evidence.md](docs/manual-evidence.md) にマニュアル番号・版・ページ単位で整理しています。

## ライセンス

MIT
