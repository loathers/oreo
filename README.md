# oreo

**oreo** is a script meant to farm 1,970 carat gold in [Kingdom of Loathing](https://www.kingdomofloathing.com/). It essentially mines as many twinkly spots in the front two rows of The Velvet / Gold Mine as it can with your hard earned adventures.

To install, run the following command on an up-to-date KoLmafia version:

```
git checkout loathers/oreo release
```

## Running oreo

In its simplest form, running oreo just requires running the following command in the KoLmafia gCLI:

```
oreo 10
```

Where "10" would be replaced by an integer telling the script how many turns you would like to spend mining. If you do not include a number after `oreo`, the script will just run until you're out of adventures. If you would like to use only your free mining skills, provide "0".

```
oreo help
```

Will list additional options that you may run, the most notable of which is the `explain` argument, which will instruct oreo to output its reason for each action it takes in a handsome green font.

## Documentation

One important alert for all interested users:

:warning: **<span style="color:red">OREO WILL NOT DIET FOR YOU; IT WILL JUST USE ADVENTURES. FILL YOUR ORGANS!</span>** :warning:

To report bugs, please post issues on this GitHub repository.

## FAQS

* The script is pronounced ore-o, because it helps you mine ore. I don't understand why so many people get this wrong.
