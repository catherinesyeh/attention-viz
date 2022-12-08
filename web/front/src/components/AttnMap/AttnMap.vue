<template>
    <div class="viewHead">Attn Map</div>
    {{ attentionByToken }}
</template>
  
  <script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";

export default {
    components: {},
    setup() {
        const store = useStore();

        const state = reactive({
            attentionByToken: computed(() => store.state.attentionByToken),
        });

        return {
            ...toRefs(state),
        };
    },
};
</script>
  
  <style lang="scss">
.viewHead {
    margin-left: 10px;
    margin-top: 10px;
}
</style>
  