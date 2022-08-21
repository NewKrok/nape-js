# Nape Physics Engine compiled to JavaScript

- Original code by Luca Deltodesco https://github.com/deltaluca/nape
- JS compiler by Andrew Bradley https://github.com/cspotcode/nape-to-js

# How to use?
Here is a simple example which demonstrate the getter/setter problem and solution.
```
import initNape from "./js/libs/nape-js.module.js";

initNape();
const space = new nape.space.Space(new nape.geom.Vec2(0, 350));

const body = new nape.phys.Body(nape.phys.BodyType.get_STATIC());
body
  .get_shapes()
  .add(new nape.shape.Polygon(nape.shape.Polygon.box(100, 100)));
body.get_position().set_x(200);
body.get_position().set_y(50);
body.set_rotation(Math.PI / 2);
body.set_space(space);
```

# Some additional info
Since it's more than 2MB and it's really just a compiled version by haxe, it's not really easy to use, probably it will be only interesting for you when you have a Haxe project and you want to easily rewrite it in vanilla JavaScript.
