import {useState, type FormEvent} from 'react';
import type {Pet, PetInput, Species} from '../../api/types';
import {Button, Input, Notice, Select, TextArea, fieldError} from '../../app/ui';

export function PetForm({initial, onSave, onCancel}: {
    initial?: Pet;
    onSave: (input: PetInput) => Promise<void>;
    onCancel?: () => void
}) {
    const [form, setForm] = useState<PetInput>({
        name: initial?.name ?? '',
        species: initial?.species ?? 'DOG',
        breed: initial?.breed ?? '',
        weight: initial?.weight ?? '',
        allergyNote: initial?.allergyNote ?? '',
        specialNote: initial?.specialNote ?? ''
    });
    const [error, setError] = useState<unknown>();
    const [pending, setPending] = useState(false);
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(undefined);
        if (!/^(?:\d{1,3})(?:\.\d{1,2})?$/.test(form.weight) || Number(form.weight) <= 0 || Number(form.weight) > 999.99) {
            setError(new Error('Cân nặng phải từ 0,01 đến 999,99 kg, tối đa 2 chữ số thập phân.'));
            return;
        }
        setPending(true);
        try {
            await onSave({
                name: form.name.trim(),
                species: form.species,
                weight: form.weight,
                breed: form.breed?.trim() || '',
                allergyNote: form.allergyNote?.trim() || '',
                specialNote: form.specialNote?.trim() || ''
            });
        } catch (e) {
            setError(e);
        } finally {
            setPending(false);
        }
    };
    return <form onSubmit={submit} className="space-y-4"><Notice error={error}/><Input label="Tên thú cưng" required
                                                                                       maxLength={100} value={form.name}
                                                                                       onChange={e => setForm({
                                                                                           ...form,
                                                                                           name: e.target.value
                                                                                       })}
                                                                                       error={fieldError(error, 'name')}/><Select
        label="Loài" value={form.species} options={[{value: 'DOG', label: 'Chó'}, {value: 'CAT', label: 'Mèo'}]}
        onChange={e => setForm({...form, species: e.target.value as Species})}
        error={fieldError(error, 'species')}/><Input label="Giống (tùy chọn)" maxLength={100} value={form.breed}
                                                     onChange={e => setForm({...form, breed: e.target.value})}
                                                     error={fieldError(error, 'breed')}/><Input label="Cân nặng (kg)"
                                                                                                required
                                                                                                inputMode="decimal"
                                                                                                value={form.weight}
                                                                                                onChange={e => setForm({
                                                                                                    ...form,
                                                                                                    weight: e.target.value
                                                                                                })}
                                                                                                error={fieldError(error, 'weight')}/><TextArea
        label="Dị ứng (tùy chọn)" value={form.allergyNote}
        onChange={e => setForm({...form, allergyNote: e.target.value})}/><TextArea label="Lưu ý đặc biệt (tùy chọn)"
                                                                                   value={form.specialNote}
                                                                                   onChange={e => setForm({
                                                                                       ...form,
                                                                                       specialNote: e.target.value
                                                                                   })}/>
        <div className="flex gap-3"><Button type="submit"
                                            disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu thú cưng'}</Button>{onCancel &&
            <Button variant="secondary" onClick={onCancel}>Hủy</Button>}</div>
    </form>;
}
