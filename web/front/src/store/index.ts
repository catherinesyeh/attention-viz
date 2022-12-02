import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import * as dataService from "@/services/dataService";
import { TypeOfList } from "underscore";

// init default 
import { Typing } from "@/utils/typing";

// Vuex docs: https://vuex.vuejs.org/

export interface State {
  matrixData: Typing.MatrixData[];
  tokenData: Typing.TokenData[];
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    matrixData: [],
    tokenData: []
  },
  modules: { // each module can contain its own state, mutations, actions, etc.
  },
  getters: {
  },
  mutations: {
    setMatrixData(state, matrixData) {
      state.matrixData = matrixData
    },
    setTokenData(state, tokenData) {
      state.tokenData = tokenData
    }
  },
  actions: { // actions commit mutations
    async init({ state, commit }) {
      const matrixData = (await dataService.getMatrixData()).data;
      commit('setMatrixData', matrixData);
      console.log('setMatrixData', matrixData)

      const tokenData = (await dataService.getTokenData()).tokens;
      commit('setTokenData', tokenData);
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}