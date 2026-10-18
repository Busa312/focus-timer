# Fox Lottie animations

Drop Lottie JSON files here and the fox uses them automatically; anything
missing falls back to the SVG fox with CSS animations.

| File                | Used for                                 | Plays |
| ------------------- | ---------------------------------------- | ----- |
| `idle.json`         | Idle, ecstatic / happy / meh moods       | loop  |
| `sad.json`          | Idle, sad mood                           | loop  |
| `focused.json`      | During a focus session (reading)         | loop  |
| `playing.json`      | During breaks                            | loop  |
| `worried.json`      | Grace period after leaving the app       | loop  |
| `celebrating.json`  | 4 s after a completed session            | once  |
| `disappointed.json` | 4 s after an abandoned session           | once  |
| `hatch.json`        | Egg hatching during the evolution moment | once  |

Blinking belongs inside the idle animations. Lottie is only used for the
default red fox without accessories; colors, accessories, the Wardrobe and the
share card always use the SVG fox.
