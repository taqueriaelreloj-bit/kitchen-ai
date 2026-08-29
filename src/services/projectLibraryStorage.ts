import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProjectStorage } from '../domain/projectLibrary';

export const asyncStorageProjectLibrary:ProjectStorage={
  getItem:key=>AsyncStorage.getItem(key),
  setItem:(key,value)=>AsyncStorage.setItem(key,value),
  removeItem:key=>AsyncStorage.removeItem(key),
};
