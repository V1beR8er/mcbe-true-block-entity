import { world, BlockPermutation } from "@minecraft/server"

world.afterEvents.entityStartSneaking.subscribe( data => {
    const p = data.entity
    const b = p.getBlockFromViewDirection().block
    createBlockEntity(b, {x: 0, y:1, z: 0})
}, {"entityFilter": {"families": ["player"]}})

/**  @param {import('@minecraft/server').Block} b @param {{x: Number, y: Number, z: Number}} initialVelocity */  
export function createBlockEntity(b, initialVelocity) {
    if (!b || b?.typeId == "minecraft:air" || b.typeId.includes("arm_collision/re")) return
    const e = b.dimension.spawnEntity("viberater:block_entity", b.bottomCenter())
    e.setDynamicProperty("block_type", b.typeId)
    const perms = b.permutation.getAllStates()
    e.setDynamicProperty("block_permutations", JSON.stringify(perms))
    try {
        e.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${b.typeId}`)
    } catch {return}
    if (b.typeId.includes("shulker_box")) {
        const cntr = b.getComponent("inventory")?.container
        const ecntr = e.getComponent("inventory")?.container
        for (let x = 0; x < cntr.size; x++) {
            ecntr.setItem(x, cntr.getItem(x))
        }
    }
    if (perms["upper_block_bit"]) {
        b.below().setType("minecraft:air")
    } else {
        b.setPermutation( BlockPermutation.resolve("minecraft:air"))
    }
    e.triggerEvent("viberater:physics")
    if (initialVelocity) e.applyImpulse(initialVelocity)
    return e
}

/** @param {import('@minecraft/server').Entity} e */
export function reduceBlockEntity(e) {
    if (!e?.isValid || !e?.dimension) return
    const perms = JSON.parse(e.getDynamicProperty("block_permutations"))
    try {
        const hb = perms["head_piece_bit"]
        const ub = perms["upper_block_bit"]
        if (hb != undefined) {
            const dir = perms["direction"]
            const z = (hb ? 1 : -1) * (dir == 0 ? -1 : (dir == 2 ? 1 : 0))
            const x = (hb ? 1 : -1) * (dir == 3 ? -1 : (dir == 1 ? 1 : 0))
            e.dimension.setBlockPermutation(e.location, BlockPermutation.resolve( e.getDynamicProperty("block_type"), perms))
            perms["head_piece_bit"] = !hb
            e.dimension.setBlockPermutation({
                x: e.location.x + x,
                y: e.location.y,
                z: e.location.z + z
            }, BlockPermutation.resolve( e.getDynamicProperty("block_type"), perms))
        } else if (ub != undefined) {
            e.dimension.setBlockPermutation({
                x: e.location.x,
                y: e.location.y + (ub ? 1 : 0),
                z: e.location.z
            }, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
            perms["upper_block_bit"] = !ub
            e.dimension.setBlockPermutation({
                x: e.location.x,
                y: e.location.y + (!ub ? 1 : 0),
                z: e.location.z
            }, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        } else {
            e.dimension.setBlockPermutation(e.location, BlockPermutation.resolve( e.getDynamicProperty("block_type"), perms))
        }
    } catch {}
    const b = e.dimension.getBlock(e.location)
    if (b.typeId.includes("shulker_box")) {
        const cntr = b.getComponent("inventory")?.container
        const ecntr = e.getComponent("inventory")?.container
        for (let x = 0; x < ecntr.size; x++) {
            cntr.setItem(x, ecntr.getItem(x))
        }
    }
    e.triggerEvent("instant_despawn")
}

world.afterEvents.dataDrivenEntityTrigger.subscribe( data => {
    const e = data.entity
    const m = data.eventId
    if (m == "viberater:reduce_block_entity") {
        reduceBlockEntity(e)
    }
}, {"entityTypes": ["viberater:block_entity"]})