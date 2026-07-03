'use client';
import type { Customer } from '@/lib/types';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface NewCustomerFormProps {
    customer: Customer;
    setCustomer: (customer: Customer) => void;
}

export default function NewCustomerForm({ customer, setCustomer }: NewCustomerFormProps) {
    
    const handleChange = (field: keyof Customer | `address.${keyof Customer['address']}`, value: string) => {
        if(typeof field === 'string' && field.startsWith('address.')) {
            const addressField = field.split('.')[1] as keyof Customer['address'];
            setCustomer({
                ...customer,
                address: {
                    ...customer.address,
                    [addressField]: value
                }
            })
        } else {
            setCustomer({
                ...customer,
                [field as keyof Customer]: value
            });
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="new-customer-name">Name</Label>
                <Input id="new-customer-name" name="name" value={customer.name} onChange={e => handleChange('name', e.target.value)} />
            </div>
             <div>
                <Label htmlFor="new-customer-email">Email</Label>
                <Input id="new-customer-email" name="email" type="email" value={customer.email} onChange={e => handleChange('email', e.target.value)} />
            </div>
             <div>
                <Label htmlFor="new-customer-phone">Telefon</Label>
                <Input id="new-customer-phone" name="phone" value={customer.phone} onChange={e => handleChange('phone', e.target.value)} />
            </div>
             <div>
                <Label htmlFor="new-customer-street">Rechnungsadresse (Straße)</Label>
                <Input id="new-customer-street" name="address.street" value={customer.address?.street} onChange={e => handleChange('address.street', e.target.value)} />
            </div>
             <div>
                <Label htmlFor="new-customer-city">Rechnungsadresse (Stadt)</Label>
                <Input id="new-customer-city" name="address.city" value={customer.address?.city} onChange={e => handleChange('address.city', e.target.value)} />
            </div>
             <div>
                <Label htmlFor="new-customer-zip">Rechnungsadresse (PLZ)</Label>
                <Input id="new-customer-zip" name="address.zip" value={customer.address?.zip} onChange={e => handleChange('address.zip', e.target.value)} />
            </div>
        </div>
    );
}
