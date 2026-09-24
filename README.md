What's good gang. I don't use github often. Lmk how I can do this better.

This simple MCBE addon exposes an easy way for you to turn any block into an entity via scripts. This is intended to be as lightweight as possible.

Its still under development. Credit where credit is due. 

Here's what it does.

There is a very simple entity with the identifier "viberater:block_entity". I will refer to it as the block entity.
It cannot rotate, and has bounciness and friction, and has 27 inventory slots
It is invisible, but has collision of slightly less than a block.
When a block is put in its mainhand, it will display that block as it looks when held
Some blocks will appear nearly distinguishable from their true block counterparts. Others look weird.
By default, I have an "environment_sensor" on it that will detect when it is on the ground. You can change this.
When it is on the ground, it will attempt to convert back into the stored block data from its dynamic properties and inventory

In the code, you have two importable functions. createBlockEntity() and reduceBlockEntity()

createBlockEntity() accepts two inputs, a Block, and an optional Vector3 that will apply an impulse to the newly created entity.
It will return the newly created block entity so you can do more with it. 
This function will write the permutations to a dynamic property. If it is a shulker, it will write the inventory of the shulker to the block entity.
There exists special cases for doors and beds. All custom blocks that are multiblocks will likely need their own special cases coded.
Once the entity is created, it will replace the block with air.

reduceBlockEntity() accepts one input, the block entity. If it is not the block entity, it will do nothing.
It will try to set the permutation of the block at the block entity's location. If it cannot for whatever reason, it will do nothing
There exists special placement for beds, doors, and shulker boxes.
After, it disappears.

there is also a commented out function where it will turn the block that a player who begins sneaking is looking at into a block entity and shoot it straight up. use this to test it out if you so please.

Ideas and known issues:

Im thinking of maybe making it a projectile. In that way, say I have a boss smash a wall and the player is on the other side. the projectile can then smack the player backward and deal damage. Could be fire hold on.

Beds will not retain their color.

I believe an algorithm for all custom multiblocks is possible, but I am not going to be the one to do it. What you can do is distinguish between horizontal and vertical, then both get and place blocks according to the saved permutation data, just as is done with doors and beds.

If you make it so that the reduceBlockEntity() fails if the inputted block entity still has a velocity < 0.05,
then you can make it so that it only turns back into a block when it has stopped moving completely.
