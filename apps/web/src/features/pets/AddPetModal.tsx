import { useDemoStore } from '../../state/DemoStoreContext';
import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { PetDraft } from '../../state/DemoStoreContext';

export function AddPetModal() {
  const { addPet, setAddPetModalOpen } = useDemoStore();
  const [newPetForm, setNewPetForm] = useState<PetDraft>({
    name: '', type: 'dog', breed: '', age: '', weight: '', gender: 'Male', notes: '',
  });
  const handleAddPetSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPetForm.name.trim() || !newPetForm.breed.trim()) return;
    addPet(newPetForm);
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
            onClick={() => setAddPetModalOpen(false)}
            className="fixed inset-0 bg-plum-noir/40 backdrop-blur-sm transition-opacity"
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="relative z-10 inline-block align-bottom bg-surface border border-border-custom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 py-5 bg-canvas border-b border-border-custom flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-text-primary">New Pet Companion Profile</h3>
            <button onClick={() => setAddPetModalOpen(false)} className="text-text-secondary hover:text-plum-noir">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddPetSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="pet-name" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Name</label>
                <input
                    id="pet-name"
                    type="text"
                    required
                    placeholder="e.g. Milo"
                    value={newPetForm.name}
                    onChange={(e) => setNewPetForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pet-type" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Species</label>
                <select
                    id="pet-type"
                    value={newPetForm.type}
                    onChange={(e) => setNewPetForm(f => ({ ...f, type: e.target.value as PetDraft['type'] }))}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="pet-breed" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Breed</label>
              <input
                  id="pet-breed"
                  type="text"
                  required
                  placeholder="e.g. Cavalier King Charles Spaniel"
                  value={newPetForm.breed}
                  onChange={(e) => setNewPetForm(f => ({ ...f, breed: e.target.value }))}
                  className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="pet-age" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Age (Years)</label>
                <input
                    id="pet-age"
                    type="number"
                    required
                    min="0"
                    max="30"
                    placeholder="3"
                    value={newPetForm.age}
                    onChange={(e) => setNewPetForm(f => ({ ...f, age: e.target.value }))}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm font-mono focus:outline-none focus:border-plum-noir"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pet-weight" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Weight (lbs)</label>
                <input
                    id="pet-weight"
                    type="number"
                    required
                    min="1"
                    max="200"
                    placeholder="14"
                    value={newPetForm.weight}
                    onChange={(e) => setNewPetForm(f => ({ ...f, weight: e.target.value }))}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm font-mono focus:outline-none focus:border-plum-noir"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="pet-gender" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Gender</label>
                <select
                    id="pet-gender"
                    value={newPetForm.gender}
                    onChange={(e) => setNewPetForm(f => ({ ...f, gender: e.target.value as PetDraft['gender'] }))}
                    className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="pet-notes" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Sensitive Skin or Grooming Prefs</label>
              <textarea
                  id="pet-notes"
                  placeholder="e.g. Prone to matting around ears, dry tail skin, allergy to lavender sprays..."
                  rows={3}
                  value={newPetForm.notes}
                  onChange={(e) => setNewPetForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-canvas border border-border-custom p-2 rounded text-sm focus:outline-none focus:border-plum-noir leading-relaxed"
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button
                  type="button"
                  onClick={() => setAddPetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold uppercase text-text-secondary hover:text-plum-noir cursor-pointer"
              >
                Cancel
              </button>
              <button
                  type="submit"
                  className="bg-plum-noir hover:bg-plum-light text-surface px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Create Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}



