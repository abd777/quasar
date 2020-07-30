import morph from '../utils/morph.js'

const morphGroups = {}
const props = [
  'duration', 'delay', 'easing', 'fill',
  'classes', 'style', 'duration', 'resize',
  'useCSS', 'hideFromClone', 'keepToClone', 'tween',
  'tweenFromOpacity', 'tweenToOpacity',
  'waitFor', 'onReady'
]
const mods = [
  'resize', 'useCSS', 'hideFromClone', 'keepToClone', 'tween'
]

function changeClass (ctx, action) {
  if (ctx.clsAction !== action) {
    ctx.clsAction = action
    ctx.el.classList[action]('q-morph--invisible')
  }
}

function trigger (group) {
  if (group.animating === true || group.queue.length < 2) {
    return
  }

  const [ from, to ] = group.queue

  group.animating = true
  from.animating = true
  to.animating = true

  changeClass(from, 'remove')
  changeClass(to, 'remove')

  morph({
    from: from.el,
    to: to.el,
    onToggle () {
      changeClass(from, 'add')
      changeClass(to, 'remove')
    },
    ...to.opts,
    onReady () {
      from.animating = false
      to.animating = false

      group.animating = false
      group.queue.shift()

      // TODO: call ctx.onReady() if available

      trigger(group)
    }
  })
}

function updateModifiers (mod, ctx) {
  const opts = ctx.opts

  mods.forEach(name => {
    opts[name] = mod[name] === true
  })
}

function insertArgs (arg, ctx) {
  const opts = typeof arg === 'string' && arg.length > 0
    ? arg.split(':') : []

  ctx.name = opts[0]
  ctx.group = opts[1]

  Object.assign(ctx.opts, {
    duration: isNaN(opts[2]) === true
      ? 300
      : parseFloat(opts[2]),
    waitFor: opts[3]
  })
}

function updateArgs (arg, ctx) {
  if (arg.group !== void 0) {
    ctx.group = arg.group
  }
  if (arg.name !== void 0) {
    ctx.name = arg.name
  }

  const opts = ctx.opts

  props.forEach(name => {
    if (arg[name] !== void 0) {
      opts[name] = arg[name]
    }
  })
}

function updateModel (name, ctx) {
  if (ctx.name === name) {
    const group = morphGroups[ctx.group]

    // if group is not registered
    if (group === void 0) {
      morphGroups[ctx.group] = {
        name: ctx.group,
        model: name,
        queue: [ ctx ],
        animating: false
      }

      changeClass(ctx, 'remove')
    }
    // if model changed
    else if (group.model !== name) {
      group.model = name
      group.queue.push(ctx)

      if (group.animating === false && group.queue.length === 2) {
        trigger(group)
      }
    }

    return
  }

  if (ctx.animating === false) {
    changeClass(ctx, 'add')
  }
}

function updateValue (ctx, value) {
  let model

  if (Object(value) === value) {
    model = '' + value.model
    updateArgs(value, ctx)
    updateModifiers(value, ctx)
  }
  else {
    model = '' + value
  }

  if (model !== ctx.model) {
    ctx.model = model
    updateModel(model, ctx)
  }
  else if (ctx.animating === false && ctx.clsAction !== void 0) {
    // ensure HMR
    ctx.el.classList[ctx.clsAction]('q-morph--invisible')
  }
}

function destroy (el) {
  const ctx = el.__qmorph

  if (ctx !== void 0) {
    const group = morphGroups[ctx.group]

    if (group !== void 0) {
      const index = group.queue.indexOf(ctx)

      if (index !== -1) {
        group.queue = group.queue.filter(item => item !== ctx)

        if (group.queue.length === 0) {
          delete morphGroups[ctx.group]
        }
      }
    }

    if (ctx.clsAction === 'add') {
      el.classList.remove('q-morph--invisible')
    }

    delete el.__qmorph
  }
}

export default {
  name: 'morph',

  inserted (el, binding) {
    if (el.__qmorph !== void 0) {
      destroy(el)
      el.__qmorph_destroyed = true
    }

    const ctx = {
      el,
      animating: false,
      opts: {}
    }

    updateModifiers(binding.modifiers, ctx)
    insertArgs(binding.arg, ctx)
    updateValue(ctx, binding.value)

    el.__qmorph = ctx
  },

  update (el, binding) {
    const ctx = el.__qmorph
    ctx !== void 0 && updateValue(ctx, binding.value)
  },

  unbind (el) {
    if (el.__qmorph_destroyed === void 0) {
      destroy(el)
    }
    else {
      delete el.__qmorph__old
    }
  }
}
