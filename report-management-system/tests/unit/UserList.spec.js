// report-management-system/tests/unit/UserList.spec.js
import { shallowMount } from '@vue/test-utils';
import UserList from '@/components/UserList.vue';

const mockRouter = {
  push: jest.fn()
};

const mockUsers = [
  { id: 1, username: 'adminUser', role: 'administrator' },
  { id: 2, username: 'generalUser', role: 'general' }
];

// currentAdminUser has id: 1, which matches mockUsers[0].id
const currentAdminUser = { id: 1, username: 'adminUser', role: 'administrator' };
// currentGeneralUser has id: 2, matching mockUsers[1].id
const currentGeneralUser = { id: 2, username: 'generalUser', role: 'general', /* other fields if any */ };


describe('UserList.vue', () => {
  let wrapper;

  const mountComponent = (propsData) => {
    return shallowMount(UserList, {
      props: {
        users: [],
        currentUser: currentAdminUser, // Default to admin for most button visibility
        isLoadingUsers: false,
        userError: null,
        ...propsData
      },
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    });
  };

  beforeEach(() => {
    mockRouter.push.mockClear();
    window.alert = jest.fn();
    window.confirm = jest.fn();
  });

  it('renders table headers correctly', () => {
    wrapper = mountComponent({ users: mockUsers });
    const headers = wrapper.findAll('th');
    expect(headers.length).toBe(3);
    expect(headers.at(0).text()).toBe('Username');
    expect(headers.at(1).text()).toBe('Role');
    expect(headers.at(2).text()).toBe('Actions');
  });

  it('renders a list of users correctly', () => {
    wrapper = mountComponent({ users: mockUsers });
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(mockUsers.length);
    expect(rows.at(0).findAll('td').at(0).text()).toBe(mockUsers[0].username);
    expect(rows.at(0).findAll('td').at(1).text()).toBe(mockUsers[0].role);
    expect(rows.at(1).findAll('td').at(0).text()).toBe(mockUsers[1].username);
    expect(rows.at(1).findAll('td').at(1).text()).toBe(mockUsers[1].role);
  });

  it('displays "No users found." when users array is empty and not loading', () => {
    wrapper = mountComponent({ users: [], isLoadingUsers: false });
    expect(wrapper.find('table').exists()).toBe(false); // Table should not render
    expect(wrapper.find('p:not(.error-message)').text()).toBe('No users found.');
  });

  it('displays loading message when isLoadingUsers is true', () => {
    wrapper = mountComponent({ users: [], isLoadingUsers: true }); // Pass users: [] to avoid rendering table
    expect(wrapper.find('p:not(.error-message)').text()).toBe('Loading users...');
  });

  it('displays error message when userError prop is set', () => {
    const errorMsg = 'Failed to fetch users.';
    wrapper = mountComponent({ userError: errorMsg });
    expect(wrapper.find('.error-message').text()).toBe(errorMsg);
  });

  it('navigates to add user page when "Add New User" button is clicked', async () => {
    wrapper = mountComponent();
    await wrapper.find('.add-user-btn').trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'UserCreate' });
  });

  it('navigates to edit user page when "Edit" button is clicked', async () => {
    wrapper = mountComponent({ users: mockUsers });
    await wrapper.findAll('tbody tr').at(0).find('.edit-btn').trigger('click');
    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'UserEdit', params: { id: mockUsers[0].id } });
  });

  describe('Delete User Functionality', () => {
    it('emits "delete-user" event with user ID when deletion is confirmed', async () => {
      window.confirm.mockReturnValue(true);
      // Admin (id 1) deleting generalUser (id 2)
      wrapper = mountComponent({ users: mockUsers, currentUser: currentAdminUser });

      await wrapper.findAll('tbody tr').at(1).find('.delete-btn').trigger('click');

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this user? This action cannot be undone.');
      expect(wrapper.emitted('delete-user')).toBeTruthy();
      expect(wrapper.emitted('delete-user')[0]).toEqual([mockUsers[1].id]); // id of generalUser
    });

    it('does not emit "delete-user" event if confirmation is cancelled', async () => {
      window.confirm.mockReturnValue(false);
      wrapper = mountComponent({ users: mockUsers, currentUser: currentAdminUser });

      await wrapper.findAll('tbody tr').at(1).find('.delete-btn').trigger('click');
      expect(window.confirm).toHaveBeenCalled();
      expect(wrapper.emitted('delete-user')).toBeFalsy();
    });

    it('disables delete button for the currently logged-in user (admin self)', () => {
      wrapper = mountComponent({ users: mockUsers, currentUser: currentAdminUser });
      const deleteButtonForSelf = wrapper.findAll('tbody tr').at(0).find('.delete-btn');
      expect(deleteButtonForSelf.attributes('disabled')).toBeDefined();
    });

    it('disables delete button for the currently logged-in user (general self)', () => {
      wrapper = mountComponent({ users: mockUsers, currentUser: currentGeneralUser });
      // currentGeneralUser has id: 2, which is mockUsers[1]
      const deleteButtonForSelf = wrapper.findAll('tbody tr').at(1).find('.delete-btn');
      expect(deleteButtonForSelf.attributes('disabled')).toBeDefined();
    });

    it('does not disable delete button for other users when current user is admin', () => {
      wrapper = mountComponent({ users: mockUsers, currentUser: currentAdminUser });
      // Admin (id 1) looking at generalUser's (id 2) delete button
      const deleteButtonForOther = wrapper.findAll('tbody tr').at(1).find('.delete-btn');
      expect(deleteButtonForOther.attributes('disabled')).toBeUndefined();
    });

    it('shows alert and does not emit event if trying to delete self by calling method directly', async () => {
      wrapper = mountComponent({ users: mockUsers, currentUser: currentAdminUser });
      wrapper.vm.confirmDeleteUser(currentAdminUser.id);

      expect(window.alert).toHaveBeenCalledWith("You cannot delete your own account.");
      expect(window.confirm).not.toHaveBeenCalled(); // Confirm should not be called
      expect(wrapper.emitted('delete-user')).toBeFalsy();
    });
  });
});
