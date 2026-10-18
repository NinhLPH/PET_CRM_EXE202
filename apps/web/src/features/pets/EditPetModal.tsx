import { useDemoStore } from '../../state/DemoStoreContext';
import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Pet } from '../../model/types';

export function EditPetModal({ pet }: { pet: Pet }) {
  const { setEditPetModalOpen, updatePet } = useDemoStore();
  const [draft, setDraft] = useState<Pet>(pet);
  const handleEditPetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updatePet(draft);
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
            onClick={() => setEditPetModalOpen(null)}
            className="fixed inset-0 bg-plum-noir/40 backdrop-blur-sm transition-opacity"
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative z-10 inline-block align-bottom bg-surface border border-border-custom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-5 bg-canvas border-b border-border-custom flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-text-primary">Edit {draft.name}'s Profile</h3>
            <button onClick={() => setEditPetModalOpen(null)} className="text-text-secondary hover:text-plum-noir">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleEditPetSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Name</label>
                <input
                    type="text"
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Species</label>
                <select
                    value={draft.type}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as Pet['type'] })}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Breed</label>
              <input
                  type="text"
                  required
                  value={draft.breed}
                  onChange={(e) => setDraft({ ...draft, breed: e.target.value })}
                  className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Age (Years)</label>
                <input
                    type="number"
                    required
                    min="0"
                    value={draft.age}
                    onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm font-mono focus:outline-none focus:border-plum-noir"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Weight (lbs)</label>
                <input
                    type="number"
                    required
                    min="1"
                    value={draft.weight}
                    onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm font-mono focus:outline-none focus:border-plum-noir"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Gender</label>
                <select
                    value={draft.gender}
                    onChange={(e) => setDraft({ ...draft, gender: e.target.value as Pet['gender'] })}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Sensitive Skin or Grooming Prefs</label>
              <textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir leading-relaxed"
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button
                  type="button"
                  onClick={() => setEditPetModalOpen(null)}
                  className="px-4 py-2 text-xs font-semibold uppercase text-text-secondary hover:text-plum-noir cursor-pointer"
              >
                Cancel
              </button>
              <button
                  type="submit"
                  className="bg-plum-noir hover:bg-plum-light text-surface px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Save Companion Details
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}




