<script>
  import { onMount } from 'svelte'
  import { slide } from 'svelte/transition'

  import { afterNavigate } from '$app/navigation'
  import { pb } from '$lib/pocketbase'
  import { authData, ownedBadges } from '$lib/stores'

  let menuOpen = $state(false)
  let pathname = $state('/')

  const toggleMenu = () => (menuOpen = !menuOpen)

  const login = async () => {
    menuOpen = false
    const loginWindow = window.open('', '_blank')
    const user = await pb.collection('users').authWithOAuth2({
      provider: 'google',
      urlCallback: (url) => {
        loginWindow.location.href = url
      }
    })

    if (pb.authStore.isValid) {
      // Update username and avatar
      user.record.avatar = user.meta.avatarUrl
      user.record.display_name = user.meta.name
      pb.collection('users').update(user.record.id, user.record)
    }

    authData.set(pb.authStore)
    await refreshOwnedBadges()
  }

  const logout = () => {
    menuOpen = false
    pb.authStore.clear()
    authData.set({ isValid: false })
    ownedBadges.set([])
  }

  const openTelegram = () => {
    menuOpen = false
    window.location.href = 'https://t.me/Ingress_Plus'
  }

  const refreshOwnedBadges = async () => ownedBadges.set(
    await pb.collection('user_badges').getFullList({
      expand: 'badge,badge.category',
      filter: `user="${pb.authStore.model.id}"`
    }))

  onMount(async () => {
    if (!pb.authStore.isValid) return
    await pb.collection('users').authRefresh()
    authData.set(pb.authStore)
    await refreshOwnedBadges()
  })

  afterNavigate(() => {
    pathname = window.location.pathname
    menuOpen = false
  })
</script>

{#snippet menu()}
  <ul transition:slide>
    {#if $authData.isValid }
      <li class="{pathname === '/agent' ? 'active' : '{$authData.model.username}'}">
        <a href="/agent">
            <img src="{$authData?.baseModel?.avatar.slice(0, -6)}" alt={$authData.baseModel.username}
              onerror={() => this.src='/images/user.svg'} />                      
            {$authData.baseModel.username}
        </a>
      </li>
    {/if}
    <li class:active={pathname.startsWith("/badges")}>
      <a href="/badges">
        <img src="/images/medal.svg" alt="Badges" /> Badges
      </a>
    </li>
    <li class:active={pathname.startsWith("/media")}>
      <a href="/media">
        <img src="/images/mediagress.png" alt="Mediagress" /> Mediagress
      </a>
    </li>
    <li class:active={pathname.startsWith("/events")}>
      <a href="/events">
        <img src="/images/event.svg" alt="Events" /> Events
      </a>
    </li>
    <!--
    <a href="/bugs">
      <li class="{pathname === '/bugs' ? 'active' : ''}">
        <img src="/images/bugs.svg" alt="Bug Tracker" /> Bug Tracker
      </li>
    </a>
    -->
    <li class:active={pathname === "/resources"}>
      <a href="/resources">
        <img src="/images/resources.svg" alt="Resources" /> Resources
      </a>
    </li>
    <li class:active={pathname === "/stats"}>
      <a href="/stats">
        <img src="/images/statistics.svg" alt="Statistics" /> Statistics
      </a>
    </li>
    <li>
      <button onclick={openTelegram}><img src="/images/telegram.svg" alt="Telegram" /> Telegram</button>
    </li>
    {#if $authData.isValid }
      <li>
        <button onclick={logout}>
          <img src="/images/logout.svg" alt="{$authData.model.username}" /> Logout
        </button>
      </li>
    {:else}
      <li>
        <button onclick={login}>
          <img src="/images/user.svg" alt="Login" /> Login
        </button>
      </li>
    {/if}
  </ul>
{/snippet}

<header>
  <div>
    <a href="/">
      <img src='/images/favicon.png' alt='Ingress Plus' height="75" width="75" />
      <h1>Ingress Plus</h1>
    </a>
  </div>
  <nav data-nav="mobile">
    <button class="hamburger" class:open={menuOpen} onclick={toggleMenu} aria-label="Menu"></button>
    {#if menuOpen}
      {@render menu()}
    {/if}
  </nav>
  <nav data-nav="large">
    {@render menu()}
  </nav>
</header>

<style>
  header {
    background: #000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100px;
    color: #FFF;
  }
  header button {
    color: #FFF;
    font-size: 1em;
  }
  div, nav {
    display: flex;
    align-items: center;
    padding: 0 1em;
  }
  header a {
    display: flex;
    align-items: center;
  }
  div:first-child img {
    height: 75px;
    margin-right: 1em;
  }
  h1 {
    font-size: 2em;
    text-align: center;
  }
  nav ul {
    list-style: none;
    display: flex;
    align-items: center;
  }
  nav ul li a, nav ul li button {
    min-width: 75px;
    width: 120px;
    text-align: center;
    cursor: pointer;
    padding: 0.5em;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0);
    transition: border 0.3s ease-in-out;
  }
  nav ul li a:hover,
  nav ul li button:hover,
  nav ul li.active {
    border-bottom: 1px solid rgba(255, 255, 255, 1);
  }
  nav ul li img {
    height: 1.5em;
    width: 1.5em;
    margin: 0;
    margin-right: 0.5em;
    border-radius: 6px;
  }
  
  nav[data-nav="large"] {
    display: flex;
  }
  nav[data-nav="mobile"] {
    display: none;
  }

  nav[data-nav="mobile"] button.hamburger {
    height: 32px;
    width: 32px;
    background-image: url('/images/menu.png');
    background-size: contain;
    transition: all 0.3s ease-in-out;
    cursor: pointer;
  }
  nav[data-nav="mobile"] button.hamburger.open {
    background-image: url('/images/close.png');
  }
  nav[data-nav="mobile"] ul {
    position: absolute;
    top: 75px;
    background: rgb(47,55,97);
    background: linear-gradient(0deg, rgba(47,55,97,0.9) 0%, rgba(17,20,35,0.9) 50%, rgba(0,0,0,1) 100%);
    flex-direction: column;
    margin: 0;
    width: 100%;
    left: 0;
    z-index: 1;
    padding: 1em 0;
    border-bottom: 3px double #5e5a75;
    border-radius: 0 0 8px 8px;
  }
  nav[data-nav="mobile"] ul li {
    padding: 1em 0.5em;
  }

  @media (max-width: 1400px) {
    nav[data-nav="large"] {
      display: none;
    }
    nav[data-nav="mobile"] {
      display: flex;
    }
    header {
      height: 75px;
    }
    div:first-child img {
      height: 55px;
      width: 55px;
      margin-right: 0.5em;
    }
    h1 {
      font-size: 1.5em;
    }
  }
</style>
