# goldmine

`goldmine` is a KoLmafia TypeScript script for farming the Velvet / Gold Mine with
selectable mining strategies. It retains Oreo's equipment acquisition, hot-resistance
handling, optional survival checks, free-mine accounting, session summary, dynamite,
and holo-wrist-puter support.

## Install

Run this in the KoLmafia gCLI:

```text
git checkout mark-e-duda/goldmine main
```

## Build

This project uses Oreo's Rollup/Babel pipeline and produces:

```text
dist/scripts/goldmine/goldmine.js
```

After restoring the dependencies in an environment where package installation is
allowed:

```text
yarn build
yarn install-mafia
```

## Usage

```text
goldmine 100 strategy=ev-cluster visibility=auto
goldmine help
```

The positional number is the number of turns to spend. As in Oreo, `0` uses only
free mining actions and omitting it runs until adventures are exhausted.

### Strategies

| Strategy | Behavior |
| --- | --- |
| `pjb` | Mine accessible sparkles in the front two rows, reset on gold or when dry |
| `oreo` | PJB loop plus Oreo's longest-second-row-vein opening move |
| `ev` | Route to the known sparkle with the best posterior EV minus λ×turns |
| `ev-cluster` | Same EV policy with the connected six-tile velvet posterior |

The default is `ev-cluster`.

### Visibility

Visibility is independent of strategy:

| Mode | Behavior |
| --- | --- |
| `low` | Ignore non-minable sparkle information |
| `auto` | Use Object Detection when already available; otherwise use low visibility |
| `high` | Maintain Object Detection with potions of detection |

The default is `auto`. High visibility remembers every revealed sparkle for the
remainder of the current cavern even if the effect expires. Unused effect turns
naturally carry across cavern resets.

`objectDetectionPrice=120` sets the economic and maximum acquisition price per
potion. Use `objectDetectionPrice=mall` to query its current Mall price.

### Dynamite

Minin' dynamite makes a minable non-sparkle route tile free. The script buys it
when its price is below the strategy's estimated value of the saved turn.
`dynamitePrice` defaults to `3400`; use `dynamitePrice=mall` to query the current
Mall price. A positive `lambda` override also becomes the saved-turn value for
EV strategies.

### EV threshold

`lambda=0` selects the calibrated default:

| EV model | Low visibility | High visibility |
| --- | ---: | ---: |
| Per-tile | 3571 | 3571 |
| Cluster | 3714 | 3500 |

Override it with, for example, `lambda=3600`.

### Calibrating λ

EV strategies can sweep λ against a deterministic bundled synthetic board
generator:

```text
goldmine calibrate strategy=ev-cluster visibility=high
goldmine calibrate strategy=ev visibility=low dynamitePrice=mall oreValue=mall
```

The default coarse sweep is 500–9000 in steps of 500, followed by six fine
points around the coarse peak. It generates 4000 boards with seed 12345 and a
0.496 probability of a second gold. Override these with `calibrationBoards`,
`calibrationSeed`, and `calibrationSecondGoldChance`; override the sweep with
`calibrationMin`, `calibrationMax`, `calibrationStep`, and
`calibrationFineSteps`.

`objectDetectionPrice`, `dynamitePrice`, `oreValue`, `goldValue`, and
`crystalValue` accept either a number or `mall`. The same resource values are
used by normal live EV decisions. `visibility=auto` calibrates as low visibility
because calibration does not assume an existing Object Detection effect.

## Other options

- `survive=true` restores enough HP to survive cave-ins.
- `explain=true` prints each strategy decision.

The script does not diet for you. Fill your organs before running it.

## Credits

The KoLmafia task engine, mining API, equipment handling, and build scaffold are
derived from [loathers/oreo](https://github.com/loathers/oreo), licensed under MIT.
