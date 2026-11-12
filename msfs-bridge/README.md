# MSFS 2020 ブリッジ

Microsoft Flight Simulator 2020 の計器の値を、同じ Wi-Fi の iPad / スマホの「フライト計器パネル」へ送ります。GitHub Pages の公開ページはそのまま残り、こちらは **このフォルダのプログラムを Windows で動かすとき専用** です。

PC でブリッジを起動すると、計器パネルのウェブページを LAN に配信し、SimConnect で読んだ速度・姿勢・高度などを WebSocket でリアルタイムに送ります。ペアリングやクラウド経由は不要です。

## 用意するもの

- Windows PC（MSFS 2020 を動かしているもの）
- [Node.js LTS](https://nodejs.org/)（インストール時、「Add to PATH」にチェック）
- iPad やスマホ（同じ Wi-Fi に接続）

## 使い方

1. Node.js LTS をインストールします（すでに入っていればスキップ）。
2. このフォルダ（`msfs-bridge`）の **`start.bat`** をダブルクリックします。
   - 初回だけ `npm install` が走ります（インターネット接続が必要です）。
3. 黒画面に、次のような URL が出ます。

   ```
   http://192.168.x.x:8080/
   ```

4. 初回起動時、Windows のファイアウォール確認が出たら **「プライベート ネットワーク」を許可** してください（「パブリック」だけだと iPad から届かないことがあります）。
5. iPad / スマホのブラウザで、表示された URL を開きます。ページが自動でシミュレータに接続し、「SIM 接続中」と出れば成功です。
6. 終了するときは、黒画面で `Ctrl+C` を押すか、窓を閉じます。

MSFS がまだ起動していなくてもブリッジは動きます。シミュレータの準備ができるまで「MSFS 待ち」と表示し、起動したら自動でつながります。プレイ中にシミュレータを終了しても、再度起動すれば自動で再接続します。

## MSFS なしで試す（モック）

`start.bat` のショートカットに `--mock` を付けるか、コマンドプロンプトで:

```bat
cd msfs-bridge
start.bat --mock
```

MSFS に接続せず、ダミーの飛行データを送ります。ブリッジやページの動作確認用です。

ポートを変えたいとき:

```bat
start.bat --port 8081
```

## うまく繋がらないとき

- PC と iPad が **同じ Wi-Fi** か確認してください（ゲスト Wi-Fi や、PC だけ有線・スマホだけ別 SSID、だと届かないことがあります）。
- ファイアウォールで Node.js を許可したか、もう一度確認してください。Windows の「セキュリティが保護したネットワーク」が「パブリック」になっているとブロックされがちです。
- 黒画面に出た URL を、PC 自身のブラウザで `http://127.0.0.1:8080/` として開けるか試してください。これで開けない場合はブリッジ側の問題です。
- VPN を切って再試行してください。
- MSFS が完全にメインメニューを過ぎてコックピットに入っているか確認してください。

## GitHub Pages との関係

https://kosetei.github.io/flight-instruments/ は従来どおり、端末のジャイロと GPS で動く静的ページです。このブリッジは使いません。iPad で Pages の URL を開いても、自宅の MSFS には繋がりません（同じ LAN の URL を開いてください）。

## 技術メモ

- SimConnect クライアントは [`node-simconnect`](https://www.npmjs.com/package/node-simconnect)（プロトコル `KittyHawk`、MSFS 2020 向け）です。
- HTTP と WebSocket（`/sim`）は同じポート（既定 8080、`0.0.0.0`）です。
- 取得している主な SimVar: `PLANE PITCH DEGREES`, `PLANE BANK DEGREES`, `PLANE HEADING DEGREES MAGNETIC`, `AIRSPEED INDICATED`, `AIRSPEED TRUE`, `INDICATED ALTITUDE`, `VERTICAL SPEED`, `TURN COORDINATOR BALL`, `DELTA HEADING RATE`, `TURN INDICATOR RATE`, `GENERAL ENG THROTTLE LEVER POSITION:1`, `TURB ENG N1:1`, `KOHLSMAN SETTING HG`, `GROUND VELOCITY`, `SIM ON GROUND`。
- ピッチは「機首先下が正」とされるため符号を反転しています。バンク・旋回・ボールの向きは実機で違う場合があるので、逆だったら issue や設定で直せるようにしてください。
