<script setup lang="ts">
import type { ResultSpec, Value, Skus } from '@/types/goodDetail'
import { ref, watchEffect } from 'vue'

function bwPowerSet(originalSet: string[]) {
  const subSets = []

  // We will have 2^n possible combinations (where n is a length of original set).
  // It is because for every element of original set we will decide whether to include
  // it or not (2 options for each set element).
  const numberOfCombinations = 2 ** originalSet.length

  // Each number in binary representation in a range from 0 to 2^n does exactly what we need:
  // it shows by its bits (0 or 1) whether to include related element from the set or not.
  // For example, for the set {1, 2, 3} the binary number of 0b010 would mean that we need to
  // include only "2" to the current set.
  for (
    let combinationIndex = 0;
    combinationIndex < numberOfCombinations;
    combinationIndex += 1
  ) {
    const subSet = []

    for (
      let setElementIndex = 0;
      setElementIndex < originalSet.length;
      setElementIndex += 1
    ) {
      // Decide whether we need to include current element into the subset or not.
      if (combinationIndex & (1 << setElementIndex)) {
        subSet.push(originalSet[setElementIndex])
      }
    }

    // Add current subset to the list of all subsets.
    subSets.push(subSet)
  }

  return subSets
}

const props = defineProps<{ specs: ResultSpec[]; skus: Skus[] }>()

const pathMap = ref<Record<string, string[]>>({})

const selectedAarry = ref<(string | undefined)[]>([])
const skuCode = ref('')

const getPathMap = (skus: Skus[]) => {
  const path: Record<string, string[]> = {}
  skus.forEach((sku) => {
    if (sku.inventory > 0) {
      const specs = sku.specs.map((spec) => spec.valueName)
      const specSet = bwPowerSet(specs)
      specSet.forEach((spec) => {
        const key = spec.join('-')
        if (path[key]) {
          path[key].push(sku.id)
        } else {
          path[key] = [sku.id]
        }
      })
    }
  })
  return path
}

const initDisabledStatus = (
  specs: ResultSpec[],
  pathMap: Record<string, string[]>
) => {
  specs.forEach((item) => {
    item.values.forEach((val) => {
      if (pathMap[val.name]) {
        val.disabled = false
      } else {
        val.disabled = true
      }
    })
  })
}

const getIsSelected = (specs: ResultSpec[]) => {
  const arr: (string | undefined)[] = []
  specs.forEach((item, index) => {
    const selected = item.values.find((val) => val.selected)
    if (selected) {
      arr[index] = selected.name
    } else {
      arr[index] = undefined
    }
  })
  return arr
}

const updateDisabledStatus = (
  specs: ResultSpec[],
  pathMap: Record<string, string[]>
) => {
  specs.forEach((item, index) => {
    const selectedArr = getIsSelected(specs)
    item.values.forEach((val) => {
      if (!val.selected) {
        selectedArr[index] = val.name
        const key = selectedArr.filter((v) => v).join('-')
        val.disabled = !pathMap[key]
      }
    })
  })
}

watchEffect(() => {
  pathMap.value = getPathMap(props.skus)
  initDisabledStatus(props.specs, pathMap.value)
})

const clickSelected = (item: ResultSpec, val: Value) => {
  if (val.disabled) return
  if (val.selected) {
    val.selected = false
    skuCode.value = ''
  } else {
    item.values.forEach((v) => {
      v.selected = false
    })
    val.selected = true
  }
  selectedAarry.value = getIsSelected(props.specs)
  if (
    selectedAarry.value.every((v) => v) &&
    pathMap.value[selectedAarry.value.join('-')]
  ) {
    skuCode.value = pathMap.value[selectedAarry.value.join('-')]?.[0] || ''
  }
  updateDisabledStatus(props.specs, pathMap.value)
}

defineExpose({
  skuCode,
  selectedAarry
})
</script>

<template>
  <div class="goods-sku">
    <dl v-for="item in specs" :key="item.id">
      <dt>{{ item.name }}</dt>
      <dd>
        <template v-for="val in item.values" :key="val.name">
          <img
            :class="{ selected: val.selected, disabled: val.disabled }"
            v-if="val.picture"
            :src="val.picture"
            @click="clickSelected(item, val)"
          />
          <span
            :class="{ selected: val.selected, disabled: val.disabled }"
            v-else
            @click="clickSelected(item, val)"
            >{{ val.name }}
          </span>
        </template>
      </dd>
    </dl>
  </div>
</template>

<style scoped lang="scss">
@mixin sku-state-mixin {
  border: 1px solid #e4e4e4;
  margin-right: 10px;
  cursor: pointer;

  &.selected {
    border-color: $xtxColor;
  }

  &.disabled {
    opacity: 0.6;
    border-style: dashed;
    cursor: not-allowed;
  }
}

.goods-sku {
  padding-left: 10px;
  padding-top: 20px;

  dl {
    display: flex;
    padding-bottom: 20px;
    align-items: center;

    dt {
      width: 50px;
      color: #999;
    }

    dd {
      flex: 1;
      color: #666;

      > img {
        width: 50px;
        height: 50px;
        margin-bottom: 4px;
        @include sku-state-mixin;
      }

      > span {
        display: inline-block;
        height: 30px;
        line-height: 28px;
        padding: 0 20px;
        margin-bottom: 4px;
        @include sku-state-mixin;
      }
    }
  }
}
</style>
