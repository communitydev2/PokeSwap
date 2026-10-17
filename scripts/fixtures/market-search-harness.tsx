// Imported by Vite during the browser regression suite so React dependencies
// resolve exactly as they do in the app, including optimized dependency URLs.
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import SearchBar from '../../src/components/reusableComponents/SearchBar';
import { usePokemonCardStore } from '../../src/store/pokemonCardsStore';

export function searchState() {
  const state = usePokemonCardStore.getState();
  return { length: state.searchQuery.length, active: state.searchActive };
}

export function mount() {
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:70px 50px auto;z-index:9999;background:#222;padding:20px';
  document.body.append(container);
  const root = createRoot(container);
  root.render(createElement(MantineProvider, null, createElement(SearchBar)));
  return () => { root.unmount(); container.remove(); };
}
