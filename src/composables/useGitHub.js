import { ref } from 'vue'

export function useGitHub() {
  const ghOwner = ref(localStorage.getItem('gh_owner') || 'HazeV98')
  const ghRepo = ref(localStorage.getItem('gh_repo') || 'Utility-Firebase')
  const ghToken = ref(localStorage.getItem('gh_admin_token') || '')
  
  const saveAuthParams = () => {
    localStorage.setItem('gh_owner', ghOwner.value)
    localStorage.setItem('gh_repo', ghRepo.value)
    localStorage.setItem('gh_admin_token', ghToken.value)
  }

  const clearAuthParams = () => {
    localStorage.removeItem('gh_owner')
    localStorage.removeItem('gh_repo')
    localStorage.removeItem('gh_admin_token')
  }

  const fetchFile = async (filePath) => {
    const url = `https://api.github.com/repos/${ghOwner.value}/${ghRepo.value}/contents/${filePath}`
    const r = await fetch(url, { headers: { Authorization: `token ${ghToken.value}` }})
    if (!r.ok) throw new Error("Failed to fetch")
    const j = await r.json()
    const content = JSON.parse(decodeURIComponent(escape(atob(j.content))))
    return { data: content, sha: j.sha }
  }

  const fetchFileRaw = async (filePath) => {
    const url = `https://api.github.com/repos/${ghOwner.value}/${ghRepo.value}/contents/${filePath}`
    const r = await fetch(url, { headers: { Authorization: `token ${ghToken.value}` }})
    if (!r.ok) throw new Error("Failed to fetch")
    const j = await r.json()
    // For raw base64 data (like zip)
    return { content: j.content, sha: j.sha }
  }

  const updateFile = async (filePath, dataObject, commitMessage, sha) => {
    const url = `https://api.github.com/repos/${ghOwner.value}/${ghRepo.value}/contents/${filePath}`
    
    // Check if we are passing an object (JSON) or a raw base64 string
    const isObj = typeof dataObject === 'object' && dataObject !== null
    const b64 = isObj ? btoa(unescape(encodeURIComponent(JSON.stringify(dataObject, null, 2)))) : dataObject
    
    const r = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `token ${ghToken.value}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMessage, content: b64, sha })
    })
    if (!r.ok) throw new Error("Failed to update")
    return await r.json()
  }

  return { ghOwner, ghRepo, ghToken, saveAuthParams, clearAuthParams, fetchFile, fetchFileRaw, updateFile }
}
