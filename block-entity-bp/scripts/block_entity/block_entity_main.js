import { world, BlockPermutation, ItemStack } from "@minecraft/server"

const replaceableBlockTags = ["snow", "minecraft:crop", "plant", "water", "fertilize_area"]
const replaceableBlacklist = ["minecraft:grass_block", "minecraft:moss_block"]
const replaceableWhitelist = ["minecraft:deadbush", "minecraft:lava", "minecraft:flowing_lava", "minecraft:air", "minecraft:vine"]

/*world.afterEvents.entityHurt.subscribe( data => {
    world.sendMessage(`dmg ${data.damage}`)
})


world.afterEvents.entityStartSneaking.subscribe(data => {
    const p = data.entity
    const b = p.getBlockFromViewDirection({"includeLiquidBlocks": true}).block
    createBlockEntity(b, { x: 0, y: 1, z: 0 })
}, { "entityFilter": { "families": ["player"] } })*/

/**  @param {import('@minecraft/server').Block} b @param {{x: Number, y: Number, z: Number}} initialVelocity */
export function createBlockEntity(b, initialVelocity) {
    if (!b || b?.typeId == "minecraft:air" || b.typeId.includes("arm_collision")) return
    const bc = b.bottomCenter()
    const e = b.dimension.spawnEntity("viberater:block_entity", bc)
    e.setDynamicProperty("block_type", b.typeId)
    const perms = b.permutation.getAllStates()
    world.sendMessage(`perms ${perms}`)
    e.setDynamicProperty("block_permutations", JSON.stringify(perms))
    const sign = b.getComponent("sign")
    if (sign) {
        world.sendMessage(`has sign`)
        e.setDynamicProperty("block_sign_front", sign.getText("Front"))
        e.setDynamicProperty("block_sign_back", sign.getText("Back"))
    }
    try {
        e.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${b.typeId}`)
    } catch { }
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
        b.setPermutation(BlockPermutation.resolve("minecraft:air"))
    }
    e.triggerEvent("viberater:physics")
    if (initialVelocity) e.getComponent("projectile").shoot(initialVelocity)
    return e
}

/** @param {import('@minecraft/server').Entity} e */
export function reduceBlockEntity(e) {
    if (!e?.isValid || !e?.dimension || e.typeId != "viberater:block_entity") return
    const v = e.getVelocity()
    if (Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2) > 0.005) return
    const perms = JSON.parse(e.getDynamicProperty("block_permutations"))
    try {
        const hb = perms["head_piece_bit"]
        const ub = perms["upper_block_bit"]
        if (hb != undefined) {
            const dir = perms["direction"]
            const z = (hbp) => { return (hbp ? 1 : -1) * (dir == 0 ? -1 : (dir == 2 ? 1 : 0))}
            const x = (hbp) => { return (hbp ? 1 : -1) * (dir == 3 ? -1 : (dir == 1 ? 1 : 0))}
            perms["head_piece_bit"] = !hb
            const nm = setBlockPermutation(e, perms, {
                x: e.location.x + x(hb),
                y: e.location.y,
                z: e.location.z + z(hb)
            })
            perms["head_piece_bit"] = hb
            const nm1 = setBlockPermutation(e, perms, {
                x: nm.x + x(!hb),
                y: nm.y,
                z: nm.z + z(!hb)
            }, false)
            if (!nm1) {
                e.dimension.setBlockPermutation(nm, BlockPermutation.resolve("minecraft:air"))
                const is = new ItemStack(e.getDynamicProperty("block_type"))
                e.dimension.spawnItem(is, e.location)
            }
        } else if (ub != undefined) {
            perms["upper_block_bit"] = false
            const nm = setBlockPermutation(e, perms)
            perms["upper_block_bit"] = true
            const nm1 = setBlockPermutation(e, perms, {
                x: nm.x,
                y: nm.y + 1,
                z: nm.z
            }, false)
            if (!nm1) {
                world.sendMessage(`destroy`)
                e.dimension.setBlockPermutation(nm, BlockPermutation.resolve("minecraft:air"))
                const is = new ItemStack(e.getDynamicProperty("block_type"))
                e.dimension.spawnItem(is, e.location)
            }
        } else {
            const nm = setBlockPermutation(e, perms)
            if (!nm) {
                const is = new ItemStack(e.getDynamicProperty("block_type"))
                e.dimension.spawnItem(is, e.location)
            }
        }
    } catch { }
    const b = e.dimension.getBlock(e.location)
    if (e.getDynamicProperty('block_sign_front')) {
        world.sendMessage(`do sign`)
        b.getComponent("sign").setText(e.getDynamicProperty("block_sign_front"), "Front")
        b.getComponent("sign").setText(e.getDynamicProperty("block_sign_back"), "Back")
    }
    if (b.typeId.includes("shulker_box")) {
        const cntr = b.getComponent("inventory")?.container
        const ecntr = e.getComponent("inventory")?.container
        for (let x = 0; x < ecntr.size; x++) {
            cntr.setItem(x, ecntr.getItem(x))
        }
    }
    e.triggerEvent("instant_despawn")
}

/** @param {import('@minecraft/server').Entity} e @param {Record<string, string | number | boolean>} perms */
function setBlockPermutation(e, perms, eloc = e.location, check = true) {
    world.sendMessage(`${perms["head_piece_bit"]}`)
    world.sendMessage(`${eloc.x} ${eloc.y} ${eloc.z}`)
    const b = e.dimension.getBlock(eloc)
    if (isReplaceable(b)) {
        e.dimension.setBlockPermutation(eloc, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return eloc
    }
    if (!check) return
    let bb = b.below()
    if (isReplaceable(bb)) {
        bb.dimension.setBlockPermutation(bb.location, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return bb.location
    }
    bb = b.above()
    if (isReplaceable(bb)) {
        bb.dimension.setBlockPermutation(bb.location, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return bb.location
    }
    bb = b.north()
    if (isReplaceable(bb)) {
        bb.dimension.setBlockPermutation(bb.location, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return bb.location
    }
    bb = b.east()
    if (isReplaceable(bb)) {
        bb.dimension.setBlockPermutation(bb.location, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return bb.location
    }
    bb = b.south()
    if (isReplaceable(bb)) {
        bb.dimension.setBlockPermutation(bb.location, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return bb.location
    }
    bb = b.west()
    if (isReplaceable(bb)) {
        bb.dimension.setBlockPermutation(bb.location, BlockPermutation.resolve(e.getDynamicProperty("block_type"), perms))
        return bb.location
    }
    return
}

/** @param {import('@minecraft/server').Block} b */
function isReplaceable(b) {
    const t = b.getTags()
    if (replaceableBlacklist.includes(b.typeId)) return false
    if (replaceableWhitelist.includes(b.typeId)) return true
    if (t.some(tag => {return replaceableBlockTags.includes(tag)})) return true
    return false
}

world.afterEvents.dataDrivenEntityTrigger.subscribe(data => {
    const e = data.entity
    const m = data.eventId
    if (m == "viberater:reduce_block_entity") {
        reduceBlockEntity(e)
    }
}, { "entityTypes": ["viberater:block_entity"] })
