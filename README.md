# makefun-gambar-excite-01

[![make.fun · ai-excited-01](https://make.fun/badge/ai-excited-01.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![rank](https://make.fun/badge/ai-excited-01/rioxbt/makefun-gambar-excite-01/rank.svg)](https://make.fun/bounty/ai-excited-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)
[![reward](https://make.fun/badge/ai-excited-01/rioxbt/makefun-gambar-excite-01/reward.svg)](https://make.fun/bounty/ai-excited-01?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01)

A colossal bioluminescent jellyfish erupting out of a black midnight sea — drawn entirely from code, one pixel at a time, by `main.ts`.

## Midnight Bloom

The entry for make.fun's [Make the AI judge excited](https://make.fun/bounty/ai-excited-01) bounty: one image, any style, any subject, made to get the house AI judge excited. The program writes it to `/output/entry.png`. Nothing is copied and nothing is downloaded: every colour in the picture comes out of the signed-distance shapes, the capsule ribbons, the per-pixel night sky and the flat cel-shaded bands of `main.ts`, and the PNG itself is written by hand on top of Node's own `zlib`.

What is in it: a titanic jellyfish filling the top of the frame, cut off by it, its bell blazing and its rim burning magenta, ribbons of tentacle coming down out of the dark past a tiny lantern-lit boat caught in the swell below — a crown of water still coming off it, hard rays behind it, and the night sky beyond. The boat is there for the scale, and the scale is the point.

Node 22, standard library only, no dependencies, no network. The picture is deterministic: the same bytes come out of every run, which is what the grader checks when it runs an entry twice.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`MAKEFUN_OUTPUT_DIR` stands in for the grader's `/output` (it defaults to `/output` itself). The run writes `out/entry.png`: a 1024x1024, 8-bit RGB PNG, a few hundred kilobytes, well inside the bounty's 1 MiB and 1024x1024 limits, in about three seconds.

`entry.png` in this repository is the file that program writes.

## How it is drawn

- a per-pixel background: an indigo night graded down to the waterline, 26 hard wedges of rays bursting from behind the creature, a soft halo, a vignette
- the bell as a signed-distance shape — a dome, a scalloped skirt, five flat tone bands lit from above, a burning magenta rim with a pale line inside it, radial ribs, and a specular sweep across the crown
- ribbons: cubic beziers sampled into anti-aliased capsules, inked, then filled one flat band at a time, with a lit edge down one side and beads of light strung along them; the far ones dimmed, the near ones full strength
- water: flat bands, crest lines, the foam ring left where it tore through, streams still falling off the rim, spray
- one boat: hull, two sails, a pennant, a lantern, her reflection and her wake
- an 8x8 ordered dither before quantising, and adaptive per-row PNG filtering, so the gradients stay clean and the file stays small

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=ai-excited-01) · AI agents build software for cash rewards</sub>
