import { useDemoStore } from '../state/DemoStoreContext';
import { Dog, Cat, Plus, Trash2, Settings, Heart } from 'lucide-react';

export function PetsPage() {
  const { pets, reminders, selectedPet, setAddPetModalOpen, setEditPetModalOpen, bookForPet, deletePet } = useDemoStore();
  const handleDeletePet = (petId: string) => {
    const pet = pets.find(item => item.id === petId);
    if (pet && confirm(`Are you sure you want to remove ${pet.name} from your pet profile?`)) {
      deletePet(petId);
    }
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-text-primary">Our Pet Companions</h1>
          <p className="text-sm text-text-secondary">Keep your companions' sensitive skin profiles and records updated.</p>
        </div>
        <button
            onClick={() => setAddPetModalOpen(true)}
            className="bg-plum-noir hover:bg-plum-light text-surface px-4 py-2 rounded text-sm font-semibold flex items-center justify-center gap-1.5 transition-all self-start cursor-pointer"
        >
          <Plus size={16} /> Add A Pet Profile
        </button>
      </div>

      {/* Pet list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {pets.map(pet => (
            <div
                key={pet.id}
                className={`bg-surface border ${selectedPet?.id === pet.id ? 'border-2 border-plum-noir' : 'border-border-custom'} rounded-lg p-6 space-y-6 relative transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted-surface border border-border-custom flex items-center justify-center text-plum-noir">
                    {pet.type === 'dog' ? <Dog size={24} /> : <Cat size={24} />}
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-text-primary">{pet.name}</h2>
                    <span className="text-xs text-text-secondary font-mono capitalize">{pet.gender} · {pet.breed}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                      onClick={() => setEditPetModalOpen(pet)}
                      className="p-1.5 text-text-secondary hover:text-plum-noir rounded hover:bg-muted-surface transition-colors"
                      title="Edit companion details"
                  >
                    <Settings size={15} />
                  </button>
                  <button
                      onClick={() => handleDeletePet(pet.id)}
                      className="p-1.5 text-text-secondary hover:text-red-700 rounded hover:bg-red-50 transition-colors"
                      title="Remove companion"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Specific Pet Specs Table */}
              <div className="grid grid-cols-3 gap-3 bg-canvas/40 p-3 rounded text-center border border-border-custom/40">
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-text-secondary">Age</span>
                  <strong className="text-sm font-mono text-plum-noir">{pet.age} Years</strong>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-text-secondary">Weight</span>
                  <strong className="text-sm font-mono text-plum-noir">{pet.weight} lbs</strong>
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider text-text-secondary">Type</span>
                  <strong className="text-sm font-mono text-plum-noir capitalize">{pet.type}</strong>
                </div>
              </div>

              {/* Botanical / Grooming Sensitive Notes */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-muted-accent flex items-center gap-1">
                  <Heart size={12} className="fill-muted-accent text-muted-accent" />
                  Apothecary & Grooming Notes
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed bg-muted-surface/40 p-3 rounded italic border border-border-custom/50">
                  "{pet.notes || 'No sensitive grooming notes added yet. Add guidelines regarding allergies or sensory preferences.'}"
                </p>
              </div>

              {/* Associated Reminders for this Pet */}
              <div className="space-y-2 pt-2 border-t border-border-custom/50">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-text-secondary">Upcoming Reminders</h4>
                <div className="space-y-1">
                  {reminders.filter(r => r.petName.toLowerCase() === pet.name.toLowerCase()).length === 0 ? (
                      <p className="text-xs text-text-secondary italic">No immediate reminders.</p>
                  ) : (
                      reminders.filter(r => r.petName.toLowerCase() === pet.name.toLowerCase()).map(rem => (
                          <div key={rem.id} className="flex items-center justify-between text-xs py-1">
                            <span className="text-text-primary text-[13px]">• {rem.title}</span>
                            <span className="font-mono text-muted-accent text-[11px]">Due {rem.dueDate}</span>
                          </div>
                      ))
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                    onClick={() => bookForPet(pet.id)}
                    className="w-full text-center bg-plum-noir hover:bg-plum-light text-surface py-2 rounded text-xs font-semibold tracking-wide transition-colors"
                >
                  Book Grooming for {pet.name}
                </button>
              </div>

            </div>
        ))}

        {pets.length === 0 && (
            <div className="col-span-2 text-center py-12 bg-surface border border-dashed border-border-custom rounded">
              <p className="text-text-secondary mb-4">No pet companion profiles found. Add your dog or cat to begin booking!</p>
              <button
                  onClick={() => setAddPetModalOpen(true)}
                  className="bg-plum-noir text-surface px-4 py-2 rounded text-sm"
              >
                Add Pet
              </button>
            </div>
        )}
      </div>

      {/* Quick action triggers */}
      <div className="bg-muted-surface/50 border border-border-custom p-6 rounded-lg text-center max-w-xl mx-auto space-y-3">
        <span className="text-xs font-mono text-muted-accent uppercase">Safe Companion Records</span>
        <h3 className="font-serif text-lg font-bold">Why do we request weight & breed?</h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          We measure weight to ensure accurate botanical dosage, and breed to allocate appropriate service times. Some coats have dense double layers requiring natural drying intervals.
        </p>
      </div>

    </div>
  );
}


