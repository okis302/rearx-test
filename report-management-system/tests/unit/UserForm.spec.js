// report-management-system/tests/unit/UserForm.spec.js
import { shallowMount } from '@vue/test-utils';
import UserForm from '@/components/UserForm.vue';

describe('UserForm.vue', () => {
  let wrapper;

  const mountComponent = (propsData = {}) => {
    return shallowMount(UserForm, {
      props: {
        userToEdit: null,
        formError: null,
        ...propsData
      }
    });
  };

  describe('Create Mode (userToEdit is null)', () => {
    beforeEach(() => {
      wrapper = mountComponent();
    });

    it('renders correctly with "Add New User" title and empty fields', () => {
      expect(wrapper.find('h2').text()).toBe('Add New User');
      expect(wrapper.find('input#username').element.value).toBe('');
      expect(wrapper.find('input#password').element.value).toBe('');
      expect(wrapper.find('select#role').element.value).toBe('general'); // Default role
      expect(wrapper.vm.isEditMode).toBe(false);
    });

    it('emits "save-user" with user data (including password) for new user', async () => {
      // Note: The component's internal validation logic was removed from handleSubmit
      // as it was decided parent/backend would handle validation via formError prop.
      // This test now focuses on data emission.
      await wrapper.setData({
        userData: { username: 'newUser', password: 'newPassword123', role: 'administrator' }
      });
      await wrapper.find('form').trigger('submit.prevent');

      expect(wrapper.emitted('save-user')).toBeTruthy();
      expect(wrapper.emitted('save-user')[0][0]).toEqual({
        id: null,
        username: 'newUser',
        password: 'newPassword123',
        role: 'administrator'
      });
    });

    // The prompt's test "requires username, password, and role for new user"
    // relied on UserForm emitting (null, "error message").
    // Since that was removed from UserForm's handleSubmit, this specific test is no longer applicable.
    // Validation errors would now come via the formError prop from the parent.
    // We can test that formError is displayed if passed (covered in a later test).
  });

  describe('Edit Mode (userToEdit is provided)', () => {
    const mockUser = { id: 1, username: 'editUser', role: 'administrator', password: 'oldPassword' };
    // Note: The 'password' field from mockUser isn't directly used to populate the form's password input,
    // as the password field is always cleared for editing.

    beforeEach(() => {
      wrapper = mountComponent({ userToEdit: { ...mockUser } }); // Pass a copy
    });

    it('renders correctly with "Edit User" title and populates fields (except password)', () => {
      expect(wrapper.find('h2').text()).toBe('Edit User');
      expect(wrapper.vm.isEditMode).toBe(true);
      expect(wrapper.vm.userData.username).toBe(mockUser.username); // Check internal data
      expect(wrapper.vm.userData.role).toBe(mockUser.role);
      expect(wrapper.vm.userData.password).toBe(''); // Password data field is cleared

      expect(wrapper.find('input#username').element.value).toBe(mockUser.username); // Check form element
      expect(wrapper.find('select#role').element.value).toBe(mockUser.role);
      expect(wrapper.find('input#password').element.value).toBe('');
      expect(wrapper.find('input#password').attributes('placeholder')).toBe('Leave blank to keep current password');
    });

    it('emits "save-user" with updated data (excluding password if not changed)', async () => {
      await wrapper.setData({ userData: { ...wrapper.vm.userData, username: 'updatedUser' } });
      await wrapper.find('form').trigger('submit.prevent');

      expect(wrapper.emitted('save-user')).toBeTruthy();
      expect(wrapper.emitted('save-user')[0][0]).toEqual({
        id: mockUser.id,
        username: 'updatedUser',
        // password property should be absent as it was not set in the form
        role: mockUser.role
      });
    });

    it('emits "save-user" with updated data (including new password if changed)', async () => {
      await wrapper.setData({
        userData: { ...wrapper.vm.userData, password: 'newPassword456' }
      });
      await wrapper.find('form').trigger('submit.prevent');

      expect(wrapper.emitted('save-user')).toBeTruthy();
      expect(wrapper.emitted('save-user')[0][0]).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        password: 'newPassword456',
        role: mockUser.role
      });
    });

    it('updates form fields correctly if userToEdit prop changes', async () => {
        const initialUser = { id: 10, username: 'user10', role: 'general' };
        const updatedUserProp = { id: 11, username: 'user11', role: 'administrator' };

        wrapper = mountComponent({ userToEdit: initialUser });
        expect(wrapper.vm.userData.username).toBe('user10');

        await wrapper.setProps({ userToEdit: updatedUserProp });

        expect(wrapper.vm.isEditMode).toBe(true);
        expect(wrapper.vm.userData.id).toBe(updatedUserProp.id);
        expect(wrapper.vm.userData.username).toBe(updatedUserProp.username);
        expect(wrapper.vm.userData.role).toBe(updatedUserProp.role);
        expect(wrapper.vm.userData.password).toBe('');
    });

    it('switches to create mode if userToEdit prop is set to null', async () => {
        wrapper = mountComponent({ userToEdit: mockUser });
        expect(wrapper.vm.isEditMode).toBe(true);

        await wrapper.setProps({ userToEdit: null });

        expect(wrapper.vm.isEditMode).toBe(false);
        expect(wrapper.vm.formTitle).toBe('Add New User');
        expect(wrapper.vm.userData.id).toBeNull();
        expect(wrapper.vm.userData.username).toBe('');
    });
  });

  it('emits "cancel-form" event when Cancel button is clicked', async () => {
    wrapper = mountComponent();
    await wrapper.find('.cancel-btn').trigger('click');
    expect(wrapper.emitted('cancel-form')).toBeTruthy();
  });

  it('displays formError prop when passed', () => {
    const errorMsg = "Username already exists.";
    wrapper = mountComponent({ formError: errorMsg });
    expect(wrapper.find('.error-message').exists()).toBe(true);
    expect(wrapper.find('.error-message').text()).toBe(errorMsg);
  });
});
