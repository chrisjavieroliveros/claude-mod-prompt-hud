# prompt-hud

Above the prompt:

    GIT  main · 14 staged · 0 changes  ▸
    ────────────────────────────────────
    [O]  CTX  ■■■■■■■■■■■□□□□□□□□□  213k

**GIT** (in a git repo, from the start of the session): the branch and how many changes are
staged and in the working tree, in 10 px type drawn as SVG in the same grid as CTX (label
column, then content), with a faint hairline between the two rows. Press the chevron to open the
same lists as the editor's Source Control view (STAGED / CHANGES, a coloured M A D R U letter, the
file name, its folder dim and cut from the start; empty lists left out); press again to close it. `git status` is read every 3 s and right after each tool
call; the band only redraws when the result changed. Each list shows up to 40 files, then `+N more`.

**Model avatar**: on the left of the CTX row only (GIT and the hairline stay at the left edge), a 20×20 px tile with the session's model as a 7×7
block monogram (Haiku `H` blue grey #8FA3B8, Sonnet `S` green #4CC38A, Opus `O` gold #E3B341, Fable
`F` reddish #E5573F): dark tile, faint ring and dim cells in the model's colour, the letter's cells lit.
Read from `$.session.model()` each time the band draws; another model shows no tile. The terminal
shows the letter in the model's colour.

**CTX**: 20 small square boxes with a soft glow over a fixed 400k-token scale (not the model's
window, so a 1M window doesn't make the bar look empty). Coloured by tokens used: green up to
200k, orange past 200k, red-orange past 250k, deep red past 330k. On the right only the tokens
(`session.measure`, `$.session.usage()`). Shown after the first reply; clears on compaction until the next reply.

No card or fill behind the row. Any band another mod draws stays above it; a survey takes the
band. The terminal draws the same row in ■ cells.

## Install

At the prompt of a terminal session:

```
/plugin install prompt-hud --marketplace chrisjavieroliveros/claude-mod-prompt-hud
```

Answer `y` to add the marketplace, then pick a scope (user = every project on that machine).

From a shell:

```
claude plugin install prompt-hud --marketplace chrisjavieroliveros/claude-mod-prompt-hud
```
