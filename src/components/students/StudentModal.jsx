import { useState, useEffect } from 'react'
import { Modal, FormField, Input, Select, Button } from '@/components/ui'

// ── College → Departments map ──────────────────────────────────────────────
export const COLLEGES = {
  'College of Computer Studies': [
    'BS Information Technology',
    'BS Computer Science',
    'BS Information Systems',
  ],
  'College of Engineering': [
    'BS Civil Engineering',
    'BS Electrical Engineering',
    'BS Mechanical Engineering',
    'BS Electronics Engineering',
  ],
  'College of Business and Accountancy': [
    'BS Accountancy',
    'BS Business Administration',
    'BS Management Accounting',
    'BS Marketing Management',
    'BS Financial Management',
  ],
  'College of Education': [
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education',
    'Bachelor of Physical Education',
  ],
  'College of Arts and Sciences': [
    'BS Psychology',
    'AB Communication',
    'BS Biology',
    'BS Mathematics',
  ],
  'College of Criminal Justice Education': [
    'BS Criminology',
  ],
  'College of Nursing': [
    'BS Nursing',
  ],
  'College of Hospitality and Tourism Management': [
    'BS Hospitality Management',
    'BS Tourism Management',
  ],
}

export const COLLEGE_NAMES = Object.keys(COLLEGES)

// ── Defaults ───────────────────────────────────────────────────────────────
const DEFAULTS = {
  name: '',
  college: '',
  course: '',
  school: '',
  year_level: '4th',
  required_hours: 486,
  start_date: '',
  status: 'active',
}

const YEAR_LEVELS = ['1st', '2nd', '3rd', '4th']

export function StudentModal({ open, onClose, onSave, initial = null }) {
  const [form, setForm] = useState(initial || DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Sync when editing a different student
  useEffect(() => {
    setForm(initial || DEFAULTS)
    setError('')
  }, [initial, open])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  // When college changes, reset course if it no longer belongs to the new college
  const handleCollegeChange = (college) => {
    const depts = COLLEGES[college] || []
    setForm(prev => ({
      ...prev,
      college,
      course: depts.includes(prev.course) ? prev.course : '',
    }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.college)     { setError('College is required.'); return }
    if (!form.course)      { setError('Course / Department is required.'); return }
    setLoading(true)
    setError('')
    try {
      await onSave(form)
      setForm(DEFAULTS)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const departments = COLLEGES[form.college] || []

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit intern' : 'Add new intern'}>
      <div className="space-y-4">

        {/* Name */}
        <FormField label="Full name *">
          <Input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Juan dela Cruz"
            autoFocus
          />
        </FormField>

        {/* College */}
        <FormField label="College *">
          <Select value={form.college} onChange={e => handleCollegeChange(e.target.value)}>
            <option value="">— select college —</option>
            {COLLEGE_NAMES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FormField>

        {/* Course / Department */}
        <FormField label="Course / Department *">
          <Select
            value={form.course}
            onChange={e => set('course', e.target.value)}
            disabled={!form.college}
          >
            <option value="">— select course —</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
          {!form.college && (
            <p className="text-xs text-stone-400 mt-1">Select a college first.</p>
          )}
        </FormField>

        {/* School + Year level */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="School">
            <Input
              value={form.school}
              onChange={e => set('school', e.target.value)}
              placeholder="e.g. SPCC"
            />
          </FormField>
          <FormField label="Year level">
            <Select value={form.year_level} onChange={e => set('year_level', e.target.value)}>
              {YEAR_LEVELS.map(y => (
                <option key={y} value={y}>{y} Year</option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Required hours + Start date */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Required hours">
            <Input
              type="number"
              value={form.required_hours}
              onChange={e => set('required_hours', parseInt(e.target.value) || 486)}
              min={1}
            />
          </FormField>
          <FormField label="Start date">
            <Input
              type="date"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
            />
          </FormField>
        </div>

        {/* Status (edit only) */}
        {initial && (
          <FormField label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </Select>
          </FormField>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : initial ? 'Save changes' : 'Add intern'}
          </Button>
        </div>

      </div>
    </Modal>
  )
}