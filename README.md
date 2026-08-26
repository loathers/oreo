# oreo

**oreo** is a KoLmafia TypeScript script for farming 1,970 carat gold in the
Velvet / Gold Mine. It supports selectable mining strategies while retaining
its equipment acquisition, hot-resistance handling, optional survival checks,
free-mine accounting, dynamite, and holo-wrist-puter support.

## Install

Run this in the KoLmafia gCLI:

```text
git checkout loathers/oreo release
```

## Build

This project uses Oreo's Rollup/Babel pipeline and produces:

```text
dist/scripts/oreo/oreo.js
```

After restoring the dependencies in an environment where package installation is
allowed:

```text
yarn build
yarn install-mafia
```

## Usage

```text
oreo 100 strategy=ev-cluster visibility=auto
oreo help
```

The positional number is the number of turns to spend. As in Oreo, `0` uses only
free mining actions and omitting it runs until adventures are exhausted.

### Strategies

| Strategy     | Behavior                                                                  |
| ------------ | ------------------------------------------------------------------------- |
| `pjb`        | Mine accessible sparkles in the front two rows, reset on gold or when dry |
| `oreo`       | PJB loop plus Oreo's longest-second-row-vein opening move                 |
| `ev`         | Route to the known sparkle with the best posterior EV minus λ×turns       |
| `ev-cluster` | Same EV policy with the connected six-tile velvet posterior               |

The default is `ev-cluster`.

### Visibility

Visibility is independent of strategy:

| Mode   | Behavior                                                                  |
| ------ | ------------------------------------------------------------------------- |
| `low`  | Ignore non-minable sparkle information                                    |
| `auto` | Use Object Detection when already available; otherwise use low visibility |
| `high` | Maintain Object Detection with potions of detection                       |

The default is `auto`. High visibility remembers every revealed sparkle for the
remainder of the current cavern even if the effect expires. Unused effect turns
naturally carry across cavern resets.

KoLmafia identifies and acquires the ascension-specific bang potion.
`objectDetectionPrice=mall` (the default) resolves that potion and queries its
Mall price for EV calibration; normal KoLmafia acquisition limits still apply.

### Dynamite

Minin' dynamite makes a minable non-sparkle route tile free. The script buys it
when its price is below the strategy's estimated value of the saved turn.
`dynamitePrice` defaults to `mall`, which queries the current Mall price. A
positive `lambda` override also becomes the saved-turn value for
EV strategies.

### EV threshold

`lambda=0` selects the calibrated default:

| EV model | Low visibility | High visibility |
| -------- | -------------: | --------------: |
| Per-tile |           3571 |            3571 |
| Cluster  |           3714 |            3500 |

Override it with, for example, `lambda=3600`.

### Calibrating λ

λ is the strategy's opportunity cost for spending another turn in the current
mine. Calibration searches for the value that produces the best average return
on synthetic boards: a lower λ mines more marginal targets, while a higher λ
resets sooner.

Calibrate when the model's probability assumptions change, or when resource
values or consumable costs change enough to alter the tradeoff between mining
and resetting. Routine Mall-price fluctuations do not require recalibration;
use the existing default or a previously calibrated `lambda` unless the relative
values have moved significantly. Recalibrate each EV strategy and visibility
mode you use because their information and routing costs differ.

EV strategies can sweep λ against a deterministic bundled synthetic board
generator:

```text
oreo calibrate strategy=ev-cluster visibility=high
oreo calibrate strategy=ev visibility=low dynamitePrice=mall oreValue=mall
oreo 100 strategy=ev visibility=high calibrate=true
```

The default coarse sweep is 500–9000 in steps of 500, followed by six fine
points around the coarse peak. It generates 1000 boards with seed 12345, which
has been sufficient for convergence in prior tournaments, and a 0.496
probability of a second gold. Increase `calibrationBoards` for a deeper run;
override the generator with `calibrationSeed` and
`secondGoldChance`, or the sweep with `calibrationMin`,
`calibrationMax`, `calibrationStep`, and `calibrationFineSteps`.
The same second-gold probability is used by live EV decisions.
Set `calibrate=true` on a normal mining command to calibrate first and then
continue mining with the resulting λ. The standalone `calibrate` subcommand
still prints the equivalent copy-pasteable command and exits.

`objectDetectionPrice`, `dynamitePrice`, `oreValue`, `goldValue`, and
`crystalValue` accept either a number or `mall`. The same resource values are
used by normal live EV decisions. `visibility=auto` calibrates as low visibility
because calibration does not assume an existing Object Detection effect.
Calibration prints a copy-pasteable command containing the resulting `lambda`
and every resolved resource and consumable price; it does not replace the
bundled defaults.

## Other options

- `survive=true` restores enough HP to survive cave-ins.
- `explain=true` prints each strategy decision.
- `useMiningOutfit=false` preserves the current outfit. The current outfit must
  already provide the required mining equipment and 15 Hot Resistance.

The script does not diet for you. Fill your organs before running it.

## FAQS

- One important alert for all interested users:
  :warning: **<span style="color:red">OREO WILL NOT DIET FOR YOU; IT WILL JUST USE ADVENTURES. FILL YOUR ORGANS!</span>** :warning:
- The script is pronounced ore-o, because it helps you mine ore. I don't understand why so many people get this wrong.
