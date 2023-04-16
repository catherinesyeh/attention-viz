

<template>
    <svg class="spinner spinner--circle" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
        <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
    </svg>
</template>
<script lang="ts">
import { onMounted, computed, reactive, toRefs, h, watch, ref, defineComponent } from "vue";
export default defineComponent({
    setup() {
    },
    methods: {
    }
})
</script>
<style lang="scss" scoped>
$offset: 187;
$duration: 1.4s;

.spinner {
    animation: circle-rotator $duration linear infinite;
    position: absolute;
    left: 180px;
    top: 15px;
    width: 40px;
    height: 40px;

    * {
        line-height: 0;
        box-sizing: border-box;
    }
}

@keyframes circle-rotator {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(270deg);
    }
}

.path {
    stroke-dasharray: $offset;
    stroke-dashoffset: 0;
    transform-origin: center;
    animation:
        circle-dash $duration ease-in-out infinite,
        circle-colors ($duration*4) ease-in-out infinite;
}

@keyframes circle-colors {
    0% {
        stroke: #A144DB;
    }

    25% {
        stroke: #528DDB;
    }

    50% {
        stroke: #5FB96C;
    }

    75% {
        stroke: #EDB50E;
    }

    100% {
        stroke: #E3378F;
    }
}

@keyframes circle-dash {
    0% {
        stroke-dashoffset: $offset;
    }

    50% {
        stroke-dashoffset: $offset/4;
        transform: rotate(135deg);
    }

    100% {
        stroke-dashoffset: $offset;
        transform: rotate(450deg);
    }
}
</style>