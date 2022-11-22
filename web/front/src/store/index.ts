import { InjectionKey } from 'vue'
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import * as dataService from "@/services/dataService";
import { TypeOfList } from "underscore";

// init default 
import { Typing } from "@/utils/typing";

export interface State {
  rawdata: string;
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state: {
    rawdata: ""
  },
  modules: {
  },
  getters: {
  },
  mutations: {
    setRawData(state, rawdata: string) {
      state.rawdata = rawdata
    }
  },
  actions: {
    async init({ state, commit }) {
      let data = await dataService.getRawData();
      commit('setRawData', data);
      console.log('setRawData', data)
    }
  },
  strict: process.env.NODE_ENV !== "production"
});

// define your own `useStore` composition function
export function useStore() {
  return baseUseStore(key)
}