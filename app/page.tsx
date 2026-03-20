'use client'

import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  email: string
  checklistState: boolean[]
  percentage: number
}

const checklistItems = [
  { id: 'ica_contract', text: 'ICA Contract/ review contracts pay (Docsign)', parent: null },
  { id: 'exp_membership', text: 'eXp Membership Completed', parent: null },
  { id: 'w9_emergency', text: 'W9 & Emergency Contact (Docsign)', parent: null },
  { id: 'board_membership', text: 'Board Membership join or office change form', parent: null },
  { id: 'supra', text: 'Supra', parent: 'board_membership' },
  { id: 'email_teamservices', text: 'Email TeamServices@exprealty.com & Your Board', parent: 'board_membership' },
  { id: 'email_setup', text: 'Email setup:', parent: null },
  { id: 'gmail_login', text: 'Gmail Login', parent: 'email_setup' },
  { id: 'phone_signature', text: 'Phone Signature Set-up', parent: 'email_setup' },
  { id: 'update_voicemail', text: 'Update Voicemail', parent: null },
  { id: 'headshot', text: 'Headshot- Send to Dana@coryhometeam.com', parent: null },
  { id: 'followup_boss', text: 'Follow-Up Boss', parent: null },
  { id: 'login', text: 'Login', parent: 'followup_boss' },
  { id: 'zillow_profile', text: 'Zillow Profile- we will update your profile and let you know when its ready', parent: null },
  { id: 'zipforms_plus', text: 'Zipforms Plus- (looks only use zip forms plus)- you set up password', parent: null },
  { id: 'download_apps', text: 'Download all apps to your smartphone', parent: null },
  { id: 'slack', text: 'Slack', parent: 'download_apps' },
  { id: 'followup_boss_app', text: 'Followup Boss', parent: 'download_apps' },
  { id: 'gmail_app', text: 'Gmail', parent: 'download_apps' },
  { id: 'google_calendar', text: 'Google calendar', parent: 'download_apps' },
  { id: 'zillow_premier', text: 'Zillow Premier Agent', parent: 'download_apps' },
  { id: 'door_code', text: 'Door Code:', parent: null },
  { id: 'mission_values', text: 'Mission/Values Sheet: 📄 Mission_Values.pdf', parent: null },
  { id: 'disc_email', text: 'DISC- in your email', parent: null },
  { id: 'visit_cht', text: 'Visit the CHT Store- mychtstore.com', parent: null },
  { id: 'intro_pm', text: 'Intro to PM-', parent: null }
]

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [checklist, setChecklist] = useState<boolean[]>(new Array(checklistItems.length).fill(false))
  const [percentage, setPercentage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentEmail, setNewAgentEmail] = useState('')

  useEffect(() => {
    fetchAgents()
  }, [])

  useEffect(() => {
    updateGHLHiddenFields()
  }, [selectedAgent, percentage])

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (agent) {
      setSelectedAgent(agent)
      const state = Array.isArray(agent.checklistState) ? agent.checklistState : []
      setChecklist(state.length === checklistItems.length ? state : new Array(checklistItems.length).fill(false))
      setPercentage(agent.percentage)
    } else {
      setSelectedAgent(null)
      setChecklist(new Array(checklistItems.length).fill(false))
      setPercentage(0)
    }
  }

  const handleChecklistChange = (index: number) => {
    const newChecklist = [...checklist]
    newChecklist[index] = !newChecklist[index]
    setChecklist(newChecklist)

    const checkedCount = newChecklist.filter(Boolean).length
    const newPercentage = Math.round((checkedCount / checklistItems.length) * 100)
    setPercentage(newPercentage)
  }

  const updateGHLHiddenFields = () => {
    setTimeout(() => {
      const emailField = document.querySelector('input[name="email"]') as HTMLInputElement
      const percentageField = document.querySelector('input[name="checklist_percentage"]') as HTMLInputElement

      if (emailField && selectedAgent) {
        emailField.value = selectedAgent.email
        emailField.dispatchEvent(new Event('input', { bubbles: true }))
      }
      if (percentageField) {
        percentageField.value = percentage.toString()
        percentageField.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, 1000)
  }

  const handleFormSubmit = async () => {
    if (!selectedAgent) return

    try {
      await fetch(`/api/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistState: checklist,
          percentage: percentage
        })
      })
      alert('Progress saved successfully!')
    } catch (error) {
      console.error('Failed to save progress:', error)
      alert('Failed to save progress')
    }
  }

  const addNewAgent = async () => {
    if (!newAgentName || !newAgentEmail) {
      alert('Please enter both name and email')
      return
    }

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          email: newAgentEmail
        })
      })

      if (res.ok) {
        await fetchAgents()
        setShowModal(false)
        setNewAgentName('')
        setNewAgentEmail('')
        alert('Agent added successfully!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add agent')
      }
    } catch (error) {
      console.error('Failed to add agent:', error)
      alert('Failed to add agent')
    }
  }

  useEffect(() => {
    const iframe = document.getElementById('inline-eWLew5BOuxjttEGpWQK2') as HTMLIFrameElement
    if (!iframe) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'form-submitted') {
        handleFormSubmit()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [selectedAgent, checklist, percentage])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8">Onboarding Checklist</h1>

          <div className="mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition"
            >
              + Add New Agent
            </button>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold mb-2">Select Agent:</label>
            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => handleAgentSelect(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">-- Select an agent --</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {selectedAgent && (
            <>
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Onboarding Progress</h3>
                <div className="bg-gray-200 h-8 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-full flex items-center justify-center text-white font-semibold transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  >
                    {percentage}%
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Checklist Items</h3>
                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-start ${item.parent ? 'ml-8' : ''}`}
                    >
                      <input
                        type="checkbox"
                        id={`check-${index}`}
                        checked={checklist[index] || false}
                        onChange={() => handleChecklistChange(index)}
                        className="mt-1 w-5 h-5 cursor-pointer"
                      />
                      <label
                        htmlFor={`check-${index}`}
                        className="ml-3 cursor-pointer flex-1"
                        dangerouslySetInnerHTML={{
                          __html: item.text
                            .replace('mychtstore.com', '<a href="https://mychtstore.com" target="_blank" class="text-blue-600 hover:underline">mychtstore.com</a>')
                            .replace('Dana@coryhometeam.com', '<a href="mailto:Dana@coryhometeam.com" class="text-blue-600 hover:underline">Dana@coryhometeam.com</a>')
                            .replace('TeamServices@exprealty.com', '<a href="mailto:TeamServices@exprealty.com" class="text-blue-600 hover:underline">TeamServices@exprealty.com</a>')
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Submit Progress</h3>

                <iframe
                  src="https://link.crushitmarketing.net/widget/form/eWLew5BOuxjttEGpWQK2"
                  style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
                  id="inline-eWLew5BOuxjttEGpWQK2"
                  data-layout="{'id':'INLINE'}"
                  data-trigger-type="alwaysShow"
                  data-trigger-value=""
                  data-activation-type="alwaysActivated"
                  data-activation-value=""
                  data-deactivation-type="neverDeactivate"
                  data-deactivation-value=""
                  data-form-name="Mark Checklist"
                  data-height="404"
                  data-layout-iframe-id="inline-eWLew5BOuxjttEGpWQK2"
                  data-form-id="eWLew5BOuxjttEGpWQK2"
                  title="Mark Checklist"
                />
                <script src="https://link.crushitmarketing.net/js/form_embed.js"></script>
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Agent</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Agent Name:</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Agent Email:</label>
                <input
                  type="email"
                  value={newAgentEmail}
                  onChange={(e) => setNewAgentEmail(e.target.value)}
                  placeholder="Enter agent email"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <button
                onClick={addNewAgent}
                className="w-full bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition"
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
