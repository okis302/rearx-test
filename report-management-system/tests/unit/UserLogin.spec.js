// report-management-system/tests/unit/UserLogin.spec.js
import { shallowMount } from '@vue/test-utils';
import UserLogin from '@/components/Login.vue'; // Using @ as alias for src, corrected to Login.vue

describe('UserLogin.vue', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = shallowMount(UserLogin, {
      // Global mocks if needed for router-link etc., but UserLogin is simple
    });
  });

  it('renders the login form correctly', () => {
    expect(wrapper.find('h2').text()).toBe('Login');
    expect(wrapper.find('label[for="userId"]').exists()).toBe(true);
    expect(wrapper.find('input#userId').exists()).toBe(true);
    expect(wrapper.find('label[for="password"]').exists()).toBe(true);
    expect(wrapper.find('input#password').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('updates userId and password data on input', async () => {
    const userIdInput = wrapper.find('input#userId');
    await userIdInput.setValue('testuser');
    expect(wrapper.vm.userId).toBe('testuser');

    const passwordInput = wrapper.find('input#password');
    await passwordInput.setValue('password123');
    expect(wrapper.vm.password).toBe('password123');
  });

  it('displays an error message if fields are empty on submit', async () => {
    await wrapper.find('form').trigger('submit.prevent');
    expect(wrapper.vm.error).toBe('User ID and Password are required.');
    expect(wrapper.find('.error-message').text()).toBe('User ID and Password are required.');
    // Ensure no login-attempt event was emitted
    expect(wrapper.emitted('login-attempt')).toBeFalsy();
  });

  it('emits login-attempt event with credentials on successful submit', async () => {
    await wrapper.setData({ userId: 'testuser', password: 'password123' });
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.vm.error).toBe(''); // No client-side error
    expect(wrapper.emitted('login-attempt')).toBeTruthy();
    expect(wrapper.emitted('login-attempt')[0]).toEqual([{ userId: 'testuser', password: 'password123' }]);
  });

  it('displays loginError prop when passed', async () => {
    // Mount new wrapper with props
    const errorWrapper = shallowMount(UserLogin, {
      props: {
        loginError: 'Invalid credentials from server.'
      }
    });
    expect(errorWrapper.find('.error-message').exists()).toBe(true);
    expect(errorWrapper.find('.error-message').text()).toBe('Invalid credentials from server.');
  });

  it('displays internal error preferentially if both internal and prop error exist', async () => {
    const errorWrapper = shallowMount(UserLogin, {
      props: {
        loginError: 'Invalid credentials from server.'
      }
    });
    // Simulate client-side validation error
    await errorWrapper.setData({ userId: '', password: '' });
    await errorWrapper.find('form').trigger('submit.prevent');

    // The component's template uses: <p v-if="error || loginError" class="error-message">{{ error || loginError }}</p>
    // So, if `error` (internal) is set, it will be shown.
    expect(errorWrapper.find('.error-message').text()).toBe('User ID and Password are required.');
  });

});
