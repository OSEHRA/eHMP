package vistacore.order.discharge;

/**
 * This class was automatically generated by the data modeler tool.
 */

public class DischargeContact implements java.io.Serializable
{

   static final long serialVersionUID = 1L;

   private java.lang.String dueDateTime;
   private java.lang.String attempts;

   public DischargeContact()
   {
   }

   public java.lang.String getDueDateTime()
   {
      return this.dueDateTime;
   }

   public void setDueDateTime(java.lang.String dueDateTime)
   {
      this.dueDateTime = dueDateTime;
   }

   public java.lang.String getAttempts()
   {
      return this.attempts;
   }

   public void setAttempts(java.lang.String attempts)
   {
      this.attempts = attempts;
   }

   public DischargeContact(java.lang.String dueDateTime, java.lang.String attempts)
   {
      this.dueDateTime = dueDateTime;
      this.attempts = attempts;
   }

}