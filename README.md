# prompt-hud

One slim row above the prompt, after the first reply:

    CTX  ■■■■■■■■■■■□□□□□□□□□  213k

**CTX**: 20 small square boxes with a soft glow over a fixed 400k-token scale (not the model's
window, so a 1M window doesn't make the bar look empty). Coloured by tokens used: green up to
200k, orange past 200k, red-orange past 250k, deep red past 330k. On the right only the tokens
(`session.measure`, `$.session.usage()`). Clears on compaction until the next reply.

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
