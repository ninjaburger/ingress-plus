<script>
  import { onMount } from 'svelte'

  import { pb } from '$lib/pocketbase'
  import zalgo from '$lib/zalgo'

  let {
    id = null,
    user = $bindable(null),
    factionLogo = true,
    linkable = true
  } = $props()

  const url = $derived(linkable && user?.public
    ? `/agent/${user.username}` : null)
  const logo = $derived(user?.faction === 'machina'
    ? 'machina.png' : `${user?.faction || 'unaligned'}.svg`)

  onMount(async () => {
    if (id || !user) user = await pb.collection('public_users').getFirstListItem(`id="${id}"`, { requestKey: null })
    if (!!user.username && user.supporter === undefined) {
      const lateUser = await pb.collection('public_users').getFirstListItem(`username="${user.username}"`, { requestKey: null })
      user = lateUser
    }
  })
</script>

{#if user && user.faction !== undefined }
  <a href={url} style="color: var(--color-faction-{user.faction || 'unaligned'})"
    class:supporter-unaligned={user?.hasUsernameGlow && !user?.faction}
    class:supporter-machina={user?.hasUsernameGlow && user?.faction === 'machina'}
    class:supporter-enlightened={user?.hasUsernameGlow && user?.faction === 'enlightened'}
    class:supporter-resistance={user?.hasUsernameGlow && user?.faction === 'resistance'} >
    {#if factionLogo}
      <img src="/images/{logo}" height="32" class={user?.faction || 'unaligned'} alt={user?.faction || 'Unaligned'} />
    {/if}
    {#if user.faction === 'machina'}
      {zalgo(user.username)}
    {:else}
      {user.username}
    {/if}
  </a>
{/if}

<style>
  a {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    vertical-align: middle;
  }
  img {
    margin-left: 0.25em;
    width: 32px;
  }
  img.machina {
    width: 22px;
    margin: 0 calc((32px - 22px) / 2);
  }
</style>
