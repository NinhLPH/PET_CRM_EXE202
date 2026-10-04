import { useDemoStore } from '../state/DemoStoreContext';
import { Check } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Profile } from '../model/types';

export function ProfilePage() {
  const { profile, saveProfile, resetDemo } = useDemoStore();
  const [profileForm, setProfileForm] = useState<Profile>({ ...profile });
  const [profileNotification, setProfileNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!profileNotification) return;
    const timeout = window.setTimeout(() => setProfileNotification(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [profileNotification]);

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProfile(profileForm);
    setProfileNotification('Profile successfully saved.');
  };

  const handleResetData = () => {
    if (confirm('Restore PetCare Boutique simulation data to default settings?')) resetDemo();
  };
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-text-primary">Profile & Preferences</h1>
        <p className="text-sm text-text-secondary mt-1">Configure saved locations and default options for {profile.name}'s account.</p>
      </div>

      {profileNotification && (
          <div className="bg-plum-pale border border-plum-noir text-plum-noir p-3 rounded text-xs font-semibold flex items-center gap-2">
            <Check size={14} /> {profileNotification}
          </div>
      )}

      <div className="bg-surface border border-border-custom rounded-lg p-6 space-y-6">

        {/* Member tier block */}
        <div className="bg-plum-pale/30 border border-plum-noir/30 rounded p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-plum-noir uppercase tracking-wider block">Boutique Customer Status</span>
            <strong className="text-serif text-lg text-plum-noir block font-serif">Apothecary Gold Member</strong>
            <span className="text-xs text-text-secondary block mt-0.5">Joined in {profile.memberSince}</span>
          </div>
          {profile.premiumStatus && (
              <span className="text-xs font-semibold text-surface bg-plum-noir px-3 py-1.5 rounded tracking-wide font-mono">
          Active VIP
        </span>
          )}
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="owner-name" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Owner Full Name</label>
              <input
                  id="owner-name"
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-canvas border border-border-custom p-2.5 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-email" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Contact Email</label>
              <input
                  id="owner-email"
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-canvas border border-border-custom p-2.5 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="owner-phone" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Phone Number</label>
            <input
                id="owner-phone"
                type="text"
                required
                value={profileForm.phone}
                onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-canvas border border-border-custom p-2.5 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="owner-address" className="block text-xs uppercase tracking-wider font-semibold text-text-secondary">Saved Shipping & Service Address</label>
            <textarea
                id="owner-address"
                required
                rows={3}
                value={profileForm.address}
                onChange={(e) => setProfileForm(f => ({ ...f, address: e.target.value }))}
                className="w-full bg-canvas border border-border-custom p-2.5 rounded text-sm text-text-primary focus:outline-none focus:border-plum-noir leading-relaxed"
            />
          </div>

          <div className="pt-4 border-t border-border-custom flex items-center justify-between gap-4">
            <button
                type="button"
                onClick={handleResetData}
                className="text-xs text-text-secondary hover:text-red-700 underline cursor-pointer"
            >
              Reset Application Defaults
            </button>
            <button
                type="submit"
                className="bg-plum-noir hover:bg-plum-light text-surface px-5 py-2.5 rounded font-semibold text-xs tracking-wide transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}


