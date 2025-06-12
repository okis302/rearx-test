// report-management-system/tests/unit/App.spec.js
import { shallowMount } from '@vue/test-utils';
import App from '@/App.vue';
import axios from 'axios';

jest.mock('axios');

const mockRouterPush = jest.fn();
// Mutable mock $route object
let mockRoute = {
  params: {},
  name: 'SomeRoute',
  path: '/somepath'
};

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => store[key] = value.toString()),
    removeItem: jest.fn(key => delete store[key]),
    clear: jest.fn(() => store = {})
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });


describe('App.vue - User Management Methods & Data Flow', () => {
  let wrapper;
  const mockUsersData = [
    { id: 1, username: 'admin', role: 'administrator', password: 'adminpassword' },
    { id: 2, username: 'user', role: 'general', password: 'userpassword' }
  ];
  const adminUser = { id: 1, username: 'admin', role: 'administrator' };
  const generalUser = { id: 2, username: 'user', role: 'general' };

  const mountApp = (currentUser = null, routeName = 'TestRoute', routeParams = {}, routePath = '/testpath') => {
    mockRoute.name = routeName;
    mockRoute.params = routeParams;
    mockRoute.path = routePath;

    const appWrapper = shallowMount(App, {
      global: {
        mocks: {
          $router: { push: mockRouterPush },
          $route: mockRoute
        },
        stubs: {
            'router-view': true,
            'router-link': { template: '<a><slot/></a>' }
        }
      }
    });
    if (currentUser) {
      appWrapper.vm.isAuthenticated = true;
      appWrapper.vm.currentUser = currentUser;
      window.localStorage.setItem('isAuthenticated', 'true');
      window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      appWrapper.vm.isAuthenticated = false;
      appWrapper.vm.currentUser = null;
      window.localStorage.removeItem('isAuthenticated');
      window.localStorage.removeItem('currentUser');
    }
    return appWrapper;
  };

  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
    mockRouterPush.mockClear();
    window.localStorage.clear();
  });

  describe('fetchUsers', () => {
    it('fetches users successfully if admin', async () => {
      wrapper = mountApp(adminUser, 'UserList');
      axios.get.mockResolvedValue({ data: mockUsersData });
      await wrapper.vm.fetchUsers();

      expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/users');
      expect(wrapper.vm.users).toEqual(mockUsersData);
      expect(wrapper.vm.isLoadingUsers).toBe(false);
      expect(wrapper.vm.userError).toBeNull();
    });

    it('prevents fetching users and sets error if not admin', async () => {
      wrapper = mountApp(generalUser, 'UserList');
      await wrapper.vm.fetchUsers();

      expect(axios.get).not.toHaveBeenCalled();
      expect(wrapper.vm.users).toEqual([]);
      expect(wrapper.vm.userError).toBe("You don't have permission to view users.");
    });

    it('handles error when fetching users', async () => {
      wrapper = mountApp(adminUser, 'UserList');
      axios.get.mockRejectedValue(new Error('Network Error'));
      await wrapper.vm.fetchUsers();

      expect(wrapper.vm.userError).toBe('Failed to load users.');
      expect(wrapper.vm.users).toEqual([]);
    });
  });

  describe('getUserById (App.vue internal)', () => {
    it('returns a user from the local users array', () => {
      wrapper = mountApp(adminUser);
      wrapper.vm.users = mockUsersData;
      const user = wrapper.vm.getUserById(mockUsersData[1].id);
      expect(user).toEqual(mockUsersData[1]);
      expect(wrapper.vm.getUserById(999)).toBeUndefined();
    });
  });

  describe('selectedUserForEdit computed property', () => {
    it('computes selectedUserForEdit correctly when on UserEdit route', () => {
        wrapper = mountApp(adminUser, 'UserEdit', { id: '2' });
        wrapper.vm.users = mockUsersData;
        expect(wrapper.vm.selectedUserForEdit).toEqual(mockUsersData[1]);
    });

    it('returns null for selectedUserForEdit when not on UserEdit route', () => {
        wrapper = mountApp(adminUser, 'SomeOtherRoute');
        wrapper.vm.users = mockUsersData;
        expect(wrapper.vm.selectedUserForEdit).toBeNull();
    });
  });

  describe('handleSaveUser', () => {
    const newUserDetails = { username: 'newUser', password: 'password', role: 'general' };
    const createdUser = { ...newUserDetails, id: 3 };
    const existingUser = mockUsersData[1];
    const updatedUserDetailsPayload = { id: existingUser.id, username: 'updatedUser', role: 'administrator' }; // Password omitted

    it('allows admin to create a new user', async () => {
      wrapper = mountApp(adminUser);
      axios.post.mockResolvedValue({ data: createdUser });
      await wrapper.vm.handleSaveUser(newUserDetails);

      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/users', newUserDetails);
      expect(wrapper.vm.users).toContainEqual(createdUser);
      expect(mockRouterPush).toHaveBeenCalledWith({ name: 'UserList' });
      expect(wrapper.vm.userError).toBeNull();
    });

    it('allows admin to update an existing user (password not changed)', async () => {
        wrapper = mountApp(adminUser);
        await wrapper.setData({users: [...mockUsersData]});

        // API returns the full user, possibly with unchanged password or however backend handles it
        const updatedUserFromApi = { ...existingUser, username: 'updatedUser', role: 'administrator' };
        axios.put.mockResolvedValue({ data: updatedUserFromApi });

        await wrapper.vm.handleSaveUser(updatedUserDetailsPayload); // Payload without password

        expect(axios.put).toHaveBeenCalledWith(`http://localhost:3001/users/${existingUser.id}`, updatedUserDetailsPayload);
        const userInVm = wrapper.vm.users.find(u => u.id === existingUser.id);
        expect(userInVm.username).toBe('updatedUser');
        expect(userInVm.role).toBe('administrator');
        expect(mockRouterPush).toHaveBeenCalledWith({ name: 'UserList' });
    });

    it('allows admin to update an existing user (password changed)', async () => {
        wrapper = mountApp(adminUser);
        await wrapper.setData({users: [...mockUsersData]});
        const payloadWithNewPassword = { ...updatedUserDetailsPayload, password: 'newSecurePassword' };
        axios.put.mockResolvedValue({ data: { ...existingUser, ...payloadWithNewPassword} }); // API returns full user

        await wrapper.vm.handleSaveUser(payloadWithNewPassword);
        expect(axios.put).toHaveBeenCalledWith(`http://localhost:3001/users/${existingUser.id}`, payloadWithNewPassword);
    });

    it('prevents general user from saving a user', async () => {
      wrapper = mountApp(generalUser);
      await wrapper.vm.handleSaveUser(newUserDetails);
      expect(axios.post).not.toHaveBeenCalled();
      expect(axios.put).not.toHaveBeenCalled();
      expect(wrapper.vm.userError).toBe('You do not have permission to save users.');
    });
  });

  describe('handleDeleteUser', () => {
    const userToDelete = mockUsersData[1]; // generalUser, id: 2

    it('allows admin to delete a user', async () => {
      wrapper = mountApp(adminUser, 'UserList');
      await wrapper.setData({users: [...mockUsersData]});
      axios.delete.mockResolvedValue({});

      await wrapper.vm.handleDeleteUser(userToDelete.id);
      expect(axios.delete).toHaveBeenCalledWith(`http://localhost:3001/users/${userToDelete.id}`);
      expect(wrapper.vm.users.find(u => u.id === userToDelete.id)).toBeUndefined();
      expect(wrapper.vm.userError).toBeNull();
    });

    it('prevents admin from deleting themselves', async () => {
      wrapper = mountApp(adminUser);
      await wrapper.setData({users: [...mockUsersData]});
      await wrapper.vm.handleDeleteUser(adminUser.id);

      expect(axios.delete).not.toHaveBeenCalled();
      expect(wrapper.vm.userError).toBe("You cannot delete your own account via this interface.");
    });

    it('navigates to UserList if deleted user was being edited', async () => {
        wrapper = mountApp(adminUser, 'UserEdit', { id: String(userToDelete.id) });
        await wrapper.setData({users: [...mockUsersData]});
        axios.delete.mockResolvedValue({});

        await wrapper.vm.handleDeleteUser(userToDelete.id);
        expect(mockRouterPush).toHaveBeenCalledWith({ name: 'UserList' });
    });

    it('prevents general user from deleting a user', async () => {
      wrapper = mountApp(generalUser);
      await wrapper.setData({users: [...mockUsersData]});
      await wrapper.vm.handleDeleteUser(userToDelete.id);

      expect(axios.delete).not.toHaveBeenCalled();
      expect(wrapper.vm.userError).toBe('You do not have permission to delete users.');
    });
  });

  it('provides correct props to router-view for user management context', async () => {
      wrapper = mountApp(adminUser, 'UserList');
      await wrapper.setData({
          users: mockUsersData,
          isLoadingUsers: true,
          userError: 'Some user error'
      });

      // These assertions check the data on App.vue's VM which are bound to router-view props.
      expect(wrapper.vm.users).toEqual(mockUsersData);
      expect(wrapper.vm.isLoadingUsers).toBe(true);
      expect(wrapper.vm.userError).toBe('Some user error');
      expect(wrapper.vm.currentUser).toEqual(adminUser);
  });
});
