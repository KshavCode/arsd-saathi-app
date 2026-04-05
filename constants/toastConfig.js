import { BaseToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props) => (
    <BaseToast
      style={{
          borderLeftColor: props.props?.borderColor,
          backgroundColor: props.props?.bg,
      }}
      {...props}
      text1Style={{
        fontSize: 15,
        color: props.props?.text1Color
      }}
      text2Style={{
        fontSize: 13,
        color: props.props?.text2Color
      }}
    />
  ),
};