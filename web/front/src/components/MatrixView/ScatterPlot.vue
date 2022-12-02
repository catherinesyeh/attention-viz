<template>
    <div>View: Head: {{ data.head }} Layer: {{ data.layer }}</div>
</template>

<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, PropType } from "vue";
import * as _ from "underscore";
import { useStore } from "@/store/index";
import { Typing } from "@/utils/typing";

export default {
    components: {},
    props: {
        data: {
            type: Object as PropType<Typing.MatrixData>,
            required: true,
        },
    },
    setup() {
        const store = useStore();

        const state = reactive({});

        return {
            ...toRefs(state),
        };
    },
};
</script>

<style lang="scss">
.viewHead {
    margin-left: 10px;
}
</style>
