// src/components/admin/UserManagementTable.tsx
'use client';

import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Edit } from 'lucide-react';
import { createUser, deleteUser, updateUserConfiguration, generateApiKeyForUser } from '@/actions/adminActions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

type User = {
  username: string;
  role: 'admin' | 'user';
  // New granular modes
  gemini_api_key_1_mode: 'global' | 'user_specific';
  gemini_api_key_2_mode: 'global' | 'user_specific';
  gemini_api_key_3_mode: 'global' | 'user_specific';
  fal_api_key_mode: 'global' | 'user_specific';
};

interface UserManagementTableProps {
  initialUsers: User[];
}

export function UserManagementTable({ initialUsers }: UserManagementTableProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await createUser(formData);
    
    if (result.success) {
      toast({ title: 'User Created', description: `User '${formData.get('username')}' has been successfully created.` });
      // Manually add user to local state to avoid full page reload
      setUsers([
        ...users,
        {
          username: formData.get('username') as string,
          role: formData.get('role') as 'admin' | 'user',
          gemini_api_key_1_mode: 'global' as 'global',
          gemini_api_key_2_mode: 'global' as 'global',
          gemini_api_key_3_mode: 'global' as 'global',
          fal_api_key_mode: 'global' as 'global',
        },
      ].sort((a, b) => a.username.localeCompare(b.username)));
      setIsCreateDialogOpen(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    const result = await deleteUser(userToDelete.username);
    if (result.success) {
      toast({ title: 'User Deleted', description: `User '${userToDelete.username}' has been deleted.` });
      setUsers(users.filter(u => u.username !== userToDelete.username));
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setUserToDelete(null);
    setIsSubmitting(false);
  }

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateUserConfiguration(formData);
    if (result.success) {
      toast({ title: 'User Updated', description: `User '${userToEdit?.username}' has been updated.` });
      // More robust optimistic update: only update what's in the form data
      setUsers(users.map(u => {
        if (u.username === userToEdit?.username) {
          const updatedUser: User = { ...u };
          if (formData.has('role')) updatedUser.role = formData.get('role') as 'admin' | 'user';
          if (formData.has('gemini_api_key_1_mode')) updatedUser.gemini_api_key_1_mode = formData.get('gemini_api_key_1_mode') as 'global' | 'user_specific';
          if (formData.has('gemini_api_key_2_mode')) updatedUser.gemini_api_key_2_mode = formData.get('gemini_api_key_2_mode') as 'global' | 'user_specific';
          if (formData.has('gemini_api_key_3_mode')) updatedUser.gemini_api_key_3_mode = formData.get('gemini_api_key_3_mode') as 'global' | 'user_specific';
          if (formData.has('fal_api_key_mode')) updatedUser.fal_api_key_mode = formData.get('fal_api_key_mode') as 'global' | 'user_specific';
          return updatedUser;
        }
        return u;
      }));
      setUserToEdit(null);
    } else {
      toast({ title: 'Update Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleGenerateKey = async () => {
    if (!userToEdit) return;
    setIsSubmitting(true);
    const result = await generateApiKeyForUser(userToEdit.username);
    if (result.success && result.apiKey) {
      setGeneratedApiKey(result.apiKey);
      toast({ title: 'API Key Generated', description: `A new key has been generated for ${userToEdit.username}.` });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const getApiKeyModeSummary = (user: User) => {
    const modes = [
      user.gemini_api_key_1_mode,
      user.gemini_api_key_2_mode,
      user.gemini_api_key_3_mode,
      user.fal_api_key_mode,
    ];
    const userSpecificCount = modes.filter(m => m === 'user_specific').length;

    if (userSpecificCount === 0) return 'All Global';
    if (userSpecificCount === modes.length) return 'All User-Specific';
    return `${userSpecificCount} / ${modes.length} User-Specific`;
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Create User</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Enter the details for the new user account.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue="user" required>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card variant="glass" className="hidden md:block">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>API Key Mode</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>{getApiKeyModeSummary(user)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setUserToEdit(user)} disabled={isSubmitting} aria-label={`Edit ${user.username}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={isSubmitting}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {users.map((user) => (
          <Card key={user.username} variant="glass">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-sm text-muted-foreground capitalize">Role: {user.role}</p>
                <p className="text-sm text-muted-foreground">Keys: {getApiKeyModeSummary(user)}</p>
              </div>
              <div className="flex items-center">
                 <Button variant="ghost" size="icon" onClick={() => setUserToEdit(user)} disabled={isSubmitting} aria-label={`Edit ${user.username}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setUserToDelete(user)} disabled={isSubmitting}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
              </div>
            </CardContent>
          </Card>
        ))}
         {users.length === 0 && (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">No users found.</CardContent>
            </Card>
         )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent>
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User: {userToEdit?.username}</DialogTitle>
              <DialogDescription>Update user role and API key configuration.</DialogDescription>
            </DialogHeader>
            {/* Hidden input for username */}
            <input type="hidden" name="username" value={userToEdit?.username || ''} />
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select name="role" defaultValue={userToEdit?.role}>
                  <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Accordion type="multiple" className="w-full">
                {[1, 2, 3].map(i => (
                  <AccordionItem key={i} value={`gemini-${i}`}>
                    <AccordionTrigger>Gemini Key {i}</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor={`gemini_api_key_${i}_mode`}>Mode</Label>
                        <Select name={`gemini_api_key_${i}_mode`} defaultValue={(userToEdit as any)?.[`gemini_api_key_${i}_mode`] || 'global'}>
                          <SelectTrigger id={`gemini_api_key_${i}_mode`}><SelectValue/></SelectTrigger>
                          <SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="user_specific">User-Specific</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`gemini_api_key_${i}`}>User-Specific Key (Optional)</Label>
                        <Input id={`gemini_api_key_${i}`} name={`gemini_api_key_${i}`} type="password" placeholder="Leave blank to keep unchanged" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
                <AccordionItem value="fal">
                  <AccordionTrigger>Fal.ai Key</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="fal_api_key_mode">Mode</Label>
                      <Select name="fal_api_key_mode" defaultValue={userToEdit?.fal_api_key_mode || 'global'}>
                        <SelectTrigger id="fal_api_key_mode"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="user_specific">User-Specific</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fal_api_key">User-Specific Key (Optional)</Label>
                      <Input id="fal_api_key" name="fal_api_key" type="password" placeholder="Leave blank to keep unchanged" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="pt-4 border-t">
                <Label>External API Key</Label>
                <p className="text-xs text-muted-foreground pb-2">Generate a key for integrations like WordPress.</p>
                <Button type="button" variant="secondary" onClick={handleGenerateKey} disabled={isSubmitting}>
                  Generate New API Key
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for &apos;{userToDelete?.username}&apos;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!generatedApiKey} onOpenChange={() => setGeneratedApiKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API Key Generated</AlertDialogTitle>
            <AlertDialogDescription>
              Copy this key and store it securely. You will not see it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 bg-muted rounded-md font-mono text-sm break-all">{generatedApiKey}</div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              navigator.clipboard.writeText(generatedApiKey || '');
              toast({ title: 'Copied!' });
              setGeneratedApiKey(null);
            }}>
              Copy & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
