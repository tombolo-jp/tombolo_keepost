<script>
  import { createEventDispatcher } from 'svelte'
  import Header from './Header.svelte'
  import Footer from './Footer.svelte'
  import PromotionBanner from './PromotionBanner.svelte'

  export let active_page = 'posts'

  const dispatch = createEventDispatcher()

  function handle_navigate(event) {
    dispatch('navigate', event.detail)
  }
</script>

<div class="layout">
  <Header {active_page} on:navigate={handle_navigate}>
    <slot name="header-actions" slot="actions"></slot>
  </Header>

  <PromotionBanner />

  <main class="main-content">
    <div class="content-wrapper">
      <slot></slot>
    </div>
  </main>

  <Footer on:navigate={handle_navigate} />
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    background-color: #f8f9fa;
  }

  .main-content {
    flex: 1;
    width: 100%;
    overflow-x: hidden;
  }

  .content-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  @media (max-width: 768px) {
    .content-wrapper {
      padding: 1rem 1rem 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .content-wrapper {
      padding: 0.75rem 0.75rem 1.5rem;
    }
  }
</style>
